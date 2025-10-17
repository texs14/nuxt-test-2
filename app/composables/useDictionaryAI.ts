import type { DictionaryEntry } from '~~/types/dictionary';
import { GEMINI_CONFIG } from '~/config/gemini';

/**
 * Composable для генерации словарных записей через Google Gemini
 */

type GenerationProgress = 'idle' | 'generating' | 'parsing' | 'validating' | 'done';

export function useDictionaryAI() {
  const { chatJSON, loading, error: geminiError } = useGemini();

  const isGenerating = computed(() => loading.value);
  const generationError = ref<string | null>(null);
  const progress = ref<GenerationProgress>('idle');

  /**
   * Создает системный промпт для генерации словарной записи
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
    const userPrompt = `Word: ${word}`;

    try {
      progress.value = 'generating';

      const result = await chatJSON<DictionaryEntry>(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          model: GEMINI_CONFIG.model,
          temperature: GEMINI_CONFIG.temperature,
          max_tokens: GEMINI_CONFIG.maxTokens,
        }
      );

      if (geminiError.value) {
        generationError.value = geminiError.value;
        progress.value = 'idle';
        return null;
      }

      if (!result) {
        generationError.value = 'Пустой ответ от Gemini';
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
