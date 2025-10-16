import type { MediaAsset } from '~~/types/dictionary';
import { createClient } from '@supabase/supabase-js';

/**
 * Server API endpoint для обновления аудио в словарной записи
 * PATCH /api/dictionary/update-audio
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const supabaseServiceKey = config.supabaseServiceKey;

  // Проверка наличия service key
  if (!supabaseServiceKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Supabase Service Key не настроен',
    });
  }

  // Чтение тела запроса
  const body = await readBody<{
    entryId: string;
    audio: MediaAsset;
  }>(event);

  // Валидация обязательных полей
  if (!body.entryId || !body.audio) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Отсутствуют обязательные параметры: entryId и audio',
    });
  }

  // Валидация MediaAsset
  if (!body.audio.mediaId || !body.audio.base64) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Некорректный формат audio: требуются mediaId и base64',
    });
  }

  try {
    // Создаем Supabase клиент с service key для обхода RLS
    const supabase = createClient(config.public.supabase.url, supabaseServiceKey);

    // 1. Получаем текущую запись
    const { data: currentEntry, error: fetchError } = await supabase
      .from('new_dictionar')
      .select('headword')
      .eq('entry_id', body.entryId)
      .single();

    if (fetchError) {
      throw createError({
        statusCode: 404,
        statusMessage: `Запись с entry_id ${body.entryId} не найдена`,
      });
    }

    // 2. Обновляем массив audio
    const currentHeadword = currentEntry.headword as any;
    const currentAudio = currentHeadword.audio || [];

    // Ищем существующее аудио с типом "word"
    const wordAudioIndex = currentAudio.findIndex((audio: MediaAsset) => audio.type === 'word');

    let updatedAudio: MediaAsset[];
    if (wordAudioIndex !== -1) {
      // Обновляем существующее
      updatedAudio = [...currentAudio];
      updatedAudio[wordAudioIndex] = body.audio;
    } else {
      // Добавляем новое в начало
      updatedAudio = [body.audio, ...currentAudio];
    }

    // 3. Создаем обновленный headword
    const updatedHeadword = {
      ...currentHeadword,
      audio: updatedAudio,
    };

    // 4. Обновляем запись в базе данных
    const { data: updatedEntry, error: updateError } = await supabase
      .from('new_dictionar')
      .update({
        headword: updatedHeadword,
        updated_at: new Date().toISOString(),
      })
      .eq('entry_id', body.entryId)
      .select()
      .single();

    if (updateError) {
      throw createError({
        statusCode: 500,
        statusMessage: `Ошибка обновления: ${updateError.message}`,
      });
    }

    // Возвращаем обновленную запись
    return {
      success: true,
      data: {
        entryId: updatedEntry.entry_id,
        headword: updatedEntry.headword,
      },
    };
  } catch (error: any) {
    // Если это уже createError, пробрасываем дальше
    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка при обновлении аудио в словаре',
    });
  }
});
