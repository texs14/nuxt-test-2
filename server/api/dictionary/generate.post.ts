import type { DictionaryEntry } from '~~/types/dictionary';
import { createClient } from '@supabase/supabase-js';
import { serverSupabaseUser } from '#supabase/server';
import { GEMINI_CONFIG } from '~/config/gemini';

/**
 * Server API endpoint для генерации словарной записи через Google Gemini
 * POST /api/dictionary/generate
 */

interface GenerateRequestBody {
  word: string;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const supabaseServiceKey = config.supabaseServiceKey;
  const geminiKey = config.geminiKey;

  // Проверка наличия ключей
  if (!supabaseServiceKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Supabase Service Key не настроен',
    });
  }

  if (!geminiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Gemini API key не настроен',
    });
  }

  // Проверка аутентификации
  const user = await serverSupabaseUser(event);
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Требуется авторизация',
    });
  }

  // Создаем Supabase клиент
  const supabase = createClient(config.public.supabase.url, supabaseServiceKey);

  // Проверка прав модератора
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'moderator' && profile.role !== 'admin')) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Недостаточно прав. Требуется роль модератора.',
    });
  }

  // Чтение тела запроса
  const body = await readBody<GenerateRequestBody>(event);

  // Валидация
  if (!body.word || typeof body.word !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Отсутствует параметр word',
    });
  }

  const normalizedWord = body.word.trim();

  if (!normalizedWord) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Слово не может быть пустым',
    });
  }

  try {
    // Проверка существования слова
    const { data: existingEntry } = await supabase
      .from('new_dictionar')
      .select('entry_id')
      .eq('headword->>script', normalizedWord)
      .single();

    if (existingEntry) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Слово уже существует в словаре',
      });
    }

    // Генерация записи через Gemini
    const systemPrompt = createSystemPrompt();
    const userPrompt = `Word: ${normalizedWord}`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const geminiResponse = await $fetch<any>('/api/gemini/chat', {
      method: 'POST',
      body: {
        messages,
        model: GEMINI_CONFIG.model,
        temperature: GEMINI_CONFIG.temperature,
        max_tokens: GEMINI_CONFIG.maxTokens,
      },
      retry: 2,
      retryDelay: 1000,
    });

    const content = geminiResponse.choices?.[0]?.message?.content;
    if (!content) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Пустой ответ от Gemini',
      });
    }

    // Парсинг JSON
    let generatedEntry: DictionaryEntry;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      generatedEntry = JSON.parse(jsonString.trim());
    } catch {
      throw createError({
        statusCode: 500,
        statusMessage: 'Ошибка парсинга JSON ответа от Gemini',
      });
    }

    // Валидация сгенерированной записи
    if (!validateEntry(generatedEntry)) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Сгенерированная запись не прошла валидацию',
      });
    }

    // Добавляем timestamps
    const now = new Date().toISOString();
    if (!generatedEntry.metadata) {
      generatedEntry.metadata = {};
    }
    generatedEntry.metadata.createdAt = now;
    generatedEntry.metadata.updatedAt = now;

    // Сохранение в базу данных
    const { data: savedEntry, error: insertError } = await supabase
      .from('new_dictionar')
      .insert({
        entry_id: generatedEntry.entryId,
        headword: generatedEntry.headword,
        metadata: generatedEntry.metadata,
        senses: generatedEntry.senses,
        related: generatedEntry.related,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (insertError) {
      throw createError({
        statusCode: 500,
        statusMessage: `Ошибка сохранения в БД: ${insertError.message}`,
      });
    }

    // Синтез аудио (синхронно)
    const thaiscript = generatedEntry.headword.script;
    try {
      await $fetch('/api/dictionary/synthesize-audio', {
        method: 'POST',
        body: {
          entryId: generatedEntry.entryId,
          text: thaiscript,
        },
      });
    } catch (audioError) {
      // Игнорируем ошибку синтеза аудио, продолжаем с записью без аудио
    }

    // Получаем обновленную запись с аудио
    const { data: finalEntry } = await supabase
      .from('new_dictionar')
      .select('*')
      .eq('entry_id', generatedEntry.entryId)
      .single();

    return {
      success: true,
      entry: {
        entryId: finalEntry.entry_id,
        headword: finalEntry.headword,
        metadata: finalEntry.metadata,
        senses: finalEntry.senses,
        related: finalEntry.related,
      },
    };
  } catch (error: any) {
    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка генерации словарной записи',
    });
  }
});

/**
 * Создает системный промпт для Gemini
 */
function createSystemPrompt(): string {
  return `Thai dictionary expert. Return ONLY valid JSON.

Schema:
{
  "entryId": "str",
  "headword": {
    "script": "thai",
    "romanization": {"paiboon": "str", "ipa": "str"},
    "partOfSpeech": "str",
    "morphology": {"syllableCount": num, "tone": "str"}
  },
  "metadata": {
    "frequency": {"spoken": 1-5, "written": 1-5},
    "topics": ["arr"],
    "sources": ["Thai National Corpus 2024"],
    "createdAt": "ISO",
    "updatedAt": "ISO"
  },
  "senses": [{
    "senseId": "str",
    "definition": {"th": "str", "en": "str", "ru": "str"},
    "usageLabels": ["arr"],
    "translations": [
      {"language": "en", "variants": [{"text": "str", "register": "str", "frequency": 1-5}]},
      {"language": "ru", "variants": [{"text": "str", "register": "str", "frequency": 1-5}]}
    ],
    "examples": [{"exampleId": "str", "sentence": {"th": "str", "en": "str", "ru": "str"}, "notes": ["arr"]}]
  }],
  "related": {"compounds": [{"entryId": "str", "relationType": "str", "gloss": {"en": "str", "ru": "str"}}]}
}

Rules:
1. All senses if polysemous
2. 1-3 examples per sense (max 10 total)
3. Accurate Paiboon + IPA
4. Include synonyms in compounds if exist
5. Omit "audio" and "media" fields`;
}

/**
 * Валидация сгенерированной записи
 */
function validateEntry(entry: any): entry is DictionaryEntry {
  if (!entry || typeof entry !== 'object') {
    return false;
  }

  if (!entry.entryId || !entry.headword || !entry.senses) {
    return false;
  }

  if (!entry.headword.script) {
    return false;
  }

  if (!Array.isArray(entry.senses) || entry.senses.length === 0) {
    return false;
  }

  for (const sense of entry.senses) {
    if (!sense.translations || !Array.isArray(sense.translations)) {
      return false;
    }

    const hasEnglish = sense.translations.some((t: any) => t.language === 'en');
    const hasRussian = sense.translations.some((t: any) => t.language === 'ru');

    if (!hasEnglish || !hasRussian) {
      return false;
    }
  }

  return true;
}
