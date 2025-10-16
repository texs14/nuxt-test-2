import type { DictionaryEntry } from '~~/types/dictionary';
import { createClient } from '@supabase/supabase-js';
import { serverSupabaseUser } from '#supabase/server';

/**
 * Server API endpoint для генерации словарной записи через GPT-4
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
  const openaiKey = config.openaiKey;

  // Проверка наличия ключей
  if (!supabaseServiceKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Supabase Service Key не настроен',
    });
  }

  if (!openaiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'OpenAI API key не настроен',
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

    // Генерация записи через GPT-4
    const systemPrompt = createSystemPrompt();
    const userPrompt = `Создай словарную запись для тайского слова: ${normalizedWord}

Верни результат в формате JSON согласно описанной структуре.`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const openaiResponse = await $fetch<any>('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: {
        model: 'gpt-4',
        messages,
        temperature: 0.7,
        max_tokens: 3000,
      },
      retry: 2,
      retryDelay: 1000,
    });

    const content = openaiResponse.choices?.[0]?.message?.content;
    if (!content) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Пустой ответ от OpenAI',
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
        statusMessage: 'Ошибка парсинга JSON ответа от GPT-4',
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
 * Создает системный промпт для GPT-4
 */
function createSystemPrompt(): string {
  return `Ты — эксперт по тайскому языку. Твоя задача — создать подробную словарную запись для тайского слова.

ВАЖНО: Ответ должен быть ТОЛЬКО в формате JSON, без дополнительного текста.

Структура ответа должна строго соответствовать следующему TypeScript интерфейсу:

{
  "entryId": "string (латиница, основанная на romanization)",
  "headword": {
    "script": "тайское слово",
    "romanization": {
      "paiboon": "романизация по системе Paiboon",
      "ipa": "IPA транскрипция"
    },
    "partOfSpeech": "noun | verb | adjective | adverb | etc.",
    "morphology": {
      "syllableCount": число_слогов,
      "tone": "тон слова"
    }
  },
  "metadata": {
    "frequency": {
      "spoken": 1-5,
      "written": 1-5
    },
    "topics": ["массив тематик"],
    "sources": ["Thai National Corpus 2024"]
  },
  "senses": [
    {
      "senseId": "entryId-значение",
      "definition": {
        "th": "определение на тайском",
        "en": "definition in English",
        "ru": "определение на русском"
      },
      "usageLabels": ["common", "formal", "etc."],
      "translations": [
        {
          "language": "en",
          "variants": [
            {
              "text": "English translation",
              "register": "neutral",
              "frequency": 1-5
            }
          ]
        },
        {
          "language": "ru",
          "variants": [
            {
              "text": "Русский перевод",
              "register": "нейтр.",
              "frequency": 1-5
            }
          ]
        }
      ],
      "examples": [
        {
          "exampleId": "senseId-ex1",
          "sentence": {
            "th": "пример на тайском",
            "en": "example in English",
            "ru": "пример на русском"
          },
          "notes": ["пояснения к примеру"]
        }
      ]
    }
  ],
  "related": {
    "compounds": [
      {
        "entryId": "составное_слово",
        "relationType": "compound",
        "gloss": {
          "en": "English gloss",
          "ru": "русская глосса"
        }
      }
    ]
  }
}

Требования:
1. Все переводы должны быть точными и реальными
2. Добавь 2-3 значения (senses) если слово многозначное
3. Для каждого значения добавь 2-3 примера использования
4. Включи синонимы в related.compounds если они есть
5. Транскрипция должна быть точной (IPA и Paiboon)
6. Не добавляй поле "audio" - оно будет заполнено автоматически
7. Не добавляй поле "media" в examples
8. Используй ISO даты для createdAt и updatedAt`;
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
