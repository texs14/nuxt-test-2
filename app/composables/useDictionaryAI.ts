import type { DictionaryEntry } from '~~/types/dictionary';

/**
 * Composable для генерации словарных записей через GPT-4
 */

type GenerationProgress = 'idle' | 'generating' | 'parsing' | 'validating' | 'done';

export function useDictionaryAI() {
  const { chatJSON, loading, error: openaiError } = useOpenAI();

  const isGenerating = computed(() => loading.value);
  const generationError = ref<string | null>(null);
  const progress = ref<GenerationProgress>('idle');

  /**
   * Создает системный промпт для генерации словарной записи
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
    "sources": ["Thai National Corpus 2024"],
    "createdAt": "ISO дата",
    "updatedAt": "ISO дата"
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
2. Добавь все значения (senses) если слово многозначное
3. Для каждого значения добавь 1-3 примера использования (не больше 10 примеров суммарно)
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
      generationError.value = 'Невалидный формат ответа';
      return false;
    }

    if (!entry.entryId || !entry.headword || !entry.senses) {
      generationError.value = 'Отсутствуют обязательные поля';
      return false;
    }

    if (!entry.headword.script) {
      generationError.value = 'Отсутствует тайское слово';
      return false;
    }

    if (!Array.isArray(entry.senses) || entry.senses.length === 0) {
      generationError.value = 'Отсутствуют значения слова';
      return false;
    }

    for (const sense of entry.senses) {
      if (!sense.translations || !Array.isArray(sense.translations)) {
        generationError.value = 'Отсутствуют переводы';
        return false;
      }

      const hasEnglish = sense.translations.some((t: any) => t.language === 'en');
      const hasRussian = sense.translations.some((t: any) => t.language === 'ru');

      if (!hasEnglish || !hasRussian) {
        generationError.value = 'Отсутствуют переводы на английский или русский';
        return false;
      }
    }

    return true;
  }

  /**
   * Генерирует словарную запись для тайского слова
   */
  async function generateEntry(word: string): Promise<DictionaryEntry | null> {
    generationError.value = null;
    progress.value = 'generating';

    const systemPrompt = createSystemPrompt();
    const userPrompt = `Создай словарную запись для тайского слова: ${word}

Верни результат в формате JSON согласно описанной структуре.`;

    try {
      progress.value = 'generating';

      const result = await chatJSON<DictionaryEntry>(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          model: 'gpt-4o-mini',
          temperature: 0.15,
          max_tokens: 3000,
        }
      );

      if (openaiError.value) {
        generationError.value = openaiError.value;
        progress.value = 'idle';
        return null;
      }

      if (!result) {
        generationError.value = 'Пустой ответ от GPT-4';
        progress.value = 'idle';
        return null;
      }

      progress.value = 'validating';

      if (!validateEntry(result)) {
        progress.value = 'idle';
        return null;
      }

      progress.value = 'done';
      return result;
    } catch (err: any) {
      generationError.value = err.message || 'Ошибка генерации словарной записи';
      progress.value = 'idle';
      return null;
    }
  }

  /**
   * Очистка ошибки
   */
  function clearError() {
    generationError.value = null;
  }

  return {
    isGenerating: readonly(isGenerating),
    generationError: readonly(generationError),
    progress: readonly(progress),
    generateEntry,
    clearError,
  };
}
