/**
 * Composable для перевода субтитров с тайского на русский и английский
 * Использует Gemini API через useGemini
 */

interface TranslationResult {
  ru: string;
  en: string;
}

interface SubtitleTranslationItem {
  id: string | number;
  th: string;
}

interface TranslationProgress {
  current: number;
  total: number;
}

export function useSubtitleTranslation() {
  const { chatJSON, loading: geminiLoading, error: geminiError } = useGemini();

  const isTranslating = ref(false);
  const translatingIds = ref<Set<string | number>>(new Set());
  const translationProgress = ref<TranslationProgress | null>(null);
  const error = ref<string | null>(null);

  // Кеш переводов для оптимизации
  const translationCache = new Map<string, TranslationResult>();

  /**
   * Переводит один текст с тайского на русский и английский
   * Использует один запрос к Gemini API
   */
  async function translateSubtitle(thaiText: string): Promise<TranslationResult | null> {
    if (!thaiText?.trim()) {
      error.value = 'Пустой текст для перевода';
      return null;
    }

    // Проверка кеша
    const cached = translationCache.get(thaiText);
    if (cached) {
      return cached;
    }

    error.value = null;

    try {
      const messages = [
        {
          role: 'system' as const,
          content:
            'Ты профессиональный переводчик с тайского языка. Переводи точно, сохраняя смысл и контекст. Отвечай ТОЛЬКО в формате JSON.',
        },
        {
          role: 'user' as const,
          content: `Переведи следующий тайский текст на русский и английский языки:
"${thaiText}"

Формат ответа:
{"ru": "русский перевод", "en": "english translation"}`,
        },
      ];

      const result = await chatJSON<TranslationResult>(messages);

      if (!result || !result.ru || !result.en) {
        error.value = 'Некорректный формат ответа от API';
        return null;
      }

      // Сохраняем в кеш
      translationCache.set(thaiText, result);

      return result;
    } catch (err: any) {
      error.value = err.message || 'Ошибка при переводе';
      return null;
    }
  }

  /**
   * Переводит массив субтитров последовательно
   * Обновляет прогресс после каждого перевода
   */
  async function translateBatch(
    subtitles: SubtitleTranslationItem[],
    onProgress?: (id: string | number, result: TranslationResult) => void
  ): Promise<void> {
    if (!subtitles.length) {
      return;
    }

    isTranslating.value = true;
    translationProgress.value = { current: 0, total: subtitles.length };
    error.value = null;

    try {
      for (let i = 0; i < subtitles.length; i++) {
        const subtitle = subtitles[i];
        if (!subtitle) {
          continue;
        }

        translatingIds.value.add(subtitle.id);

        const result = await translateSubtitle(subtitle.th);

        translatingIds.value.delete(subtitle.id);

        if (result && onProgress) {
          onProgress(subtitle.id, result);
        }

        translationProgress.value.current = i + 1;

        // Задержка между запросами для предотвращения rate limiting
        if (i < subtitles.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    } finally {
      isTranslating.value = false;
      translatingIds.value.clear();
      translationProgress.value = null;
    }
  }

  /**
   * Проверяет, переводится ли конкретный субтитр
   */
  function isTranslatingId(id: string | number): boolean {
    return translatingIds.value.has(id);
  }

  /**
   * Очистка ошибки
   */
  function clearError() {
    error.value = null;
  }

  /**
   * Очистка кеша переводов
   */
  function clearCache() {
    translationCache.clear();
  }

  return {
    isTranslating: readonly(isTranslating),
    translatingIds: readonly(translatingIds),
    translationProgress: readonly(translationProgress),
    error: readonly(error),
    geminiLoading: readonly(geminiLoading),
    geminiError: readonly(geminiError),
    translateSubtitle,
    translateBatch,
    isTranslatingId,
    clearError,
    clearCache,
  };
}
