import type { MediaAsset } from '~~/types/dictionary';
import { createClient } from '@supabase/supabase-js';
import type { ResembleSynthesizeResponse } from '~~/types/resemble';

/**
 * Server API endpoint для синтеза аудио и добавления его в словарную запись
 * POST /api/dictionary/synthesize-audio
 */

interface SynthesizeAudioRequestBody {
  entryId: string;
  text: string;
  voiceUuid?: string;
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const supabaseServiceKey = config.supabaseServiceKey;
  const resembleKey = config.resembleKey;

  // Проверка наличия ключей
  if (!supabaseServiceKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Supabase Service Key не настроен',
    });
  }

  if (!resembleKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Resemble API key не настроен',
    });
  }

  // Чтение тела запроса
  const body = await readBody<SynthesizeAudioRequestBody>(event);

  // Валидация
  if (!body.entryId || !body.text) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Отсутствуют обязательные параметры: entryId и text',
    });
  }

  try {
    // Создаем Supabase клиент
    const supabase = createClient(config.public.supabase.url, supabaseServiceKey);

    // Проверка существования записи
    const { data: existingEntry, error: fetchError } = await supabase
      .from('new_dictionar')
      .select('entry_id, headword')
      .eq('entry_id', body.entryId)
      .single();

    if (fetchError || !existingEntry) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Запись не найдена',
      });
    }

    // Синтез речи через Resemble AI
    const voiceUuid = body.voiceUuid || '6e922b40';

    const synthesizeResponse = await $fetch<ResembleSynthesizeResponse>(
      'https://f.cluster.resemble.ai/synthesize',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resembleKey}`,
          'Content-Type': 'application/json',
          'Accept-Encoding': 'gzip, deflate, br',
        },
        body: {
          voice_uuid: voiceUuid,
          data: `<speak><lang xml:lang="th-th">${body.text}</lang></speak>`,
          sample_rate: 44100,
          output_format: 'wav',
          precision: 'PCM_32',
        },
      }
    );

    if (!synthesizeResponse.success) {
      throw createError({
        statusCode: 500,
        statusMessage: `Ошибка синтеза: ${synthesizeResponse.issues?.join(', ') || 'Неизвестная ошибка'}`,
      });
    }

    // Используем audio_content из ответа (уже в base64)
    const base64DataUrl = `data:audio/wav;base64,${synthesizeResponse.audio_content}`;

    // Создание MediaAsset
    const audioAsset: MediaAsset = {
      mediaId: `audio-${body.entryId}-${Date.now()}`,
      base64: base64DataUrl,
      type: 'word',
      speaker: 'resemble_ai_thai',
      license: 'CC-BY',
    };

    // Обновление записи в БД
    const currentHeadword = existingEntry.headword as any;
    const currentAudio = currentHeadword.audio || [];

    // Ищем существующее аудио с типом "word"
    const wordAudioIndex = currentAudio.findIndex((audio: MediaAsset) => audio.type === 'word');

    let updatedAudio: MediaAsset[];
    if (wordAudioIndex !== -1) {
      updatedAudio = [...currentAudio];
      updatedAudio[wordAudioIndex] = audioAsset;
    } else {
      updatedAudio = [audioAsset, ...currentAudio];
    }

    const updatedHeadword = {
      ...currentHeadword,
      audio: updatedAudio,
    };

    const { error: updateError } = await supabase
      .from('new_dictionar')
      .update({
        headword: updatedHeadword,
        updated_at: new Date().toISOString(),
      })
      .eq('entry_id', body.entryId);

    if (updateError) {
      throw createError({
        statusCode: 500,
        statusMessage: `Ошибка обновления БД: ${updateError.message}`,
      });
    }

    return {
      success: true,
      audio: audioAsset,
    };
  } catch (error: any) {
    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка синтеза аудио',
    });
  }
});
