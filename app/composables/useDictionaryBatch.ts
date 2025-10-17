/**
 * Composable для массовой обработки слов и добавления в словарь
 */

export interface WordProcessResult {
  word: string;
  status: 'pending' | 'processing' | 'success' | 'skipped' | 'error';
  error?: string;
}

export interface BatchStats {
  total: number;
  processed: number;
  added: number;
  skipped: number;
  errors: number;
}

export function useDictionaryBatch() {
  const isProcessing = ref(false);
  const isCancelled = ref(false);
  const currentWord = ref<string>('');
  const progress = ref(0);
  const totalWords = ref(0);

  const results = ref<WordProcessResult[]>([]);
  const stats = ref<BatchStats>({
    total: 0,
    processed: 0,
    added: 0,
    skipped: 0,
    errors: 0,
  });

  /**
   * Сброс состояния
   */
  function reset() {
    isProcessing.value = false;
    isCancelled.value = false;
    currentWord.value = '';
    progress.value = 0;
    totalWords.value = 0;
    results.value = [];
    stats.value = {
      total: 0,
      processed: 0,
      added: 0,
      skipped: 0,
      errors: 0,
    };
  }

  /**
   * Отмена обработки
   */
  function cancel() {
    isCancelled.value = true;
  }

  /**
   * Проверка слов на наличие в словаре
   */
  async function checkWords(words: string[]): Promise<{ existing: string[]; missing: string[] }> {
    try {
      const response = await $fetch<{ total: number; existing: string[]; missing: string[] }>(
        '/api/dictionary/batch-check',
        {
          method: 'POST',
          body: { words },
        }
      );
      return { existing: response.existing, missing: response.missing };
    } catch (error: any) {
      throw new Error(error.data?.statusMessage || 'Ошибка проверки слов');
    }
  }

  /**
   * Обработка одного слова
   */
  async function processWord(word: string): Promise<'success' | 'error'> {
    try {
      await $fetch('/api/dictionary/generate', {
        method: 'POST',
        body: { word },
      });
      return 'success';
    } catch (error: any) {
      // Ошибка обработки слова
      return 'error';
    }
  }

  /**
   * Задержка между запросами
   */
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  /**
   * Массовая обработка слов
   */
  async function processBatch(words: string[]): Promise<void> {
    if (isProcessing.value) {
      throw new Error('Обработка уже выполняется');
    }

    reset();
    isProcessing.value = true;

    // Удаление дубликатов и пустых строк
    const uniqueWords = Array.from(new Set(words.map((w) => w.trim()).filter((w) => w.length > 0)));

    if (uniqueWords.length === 0) {
      isProcessing.value = false;
      throw new Error('Нет слов для обработки');
    }

    totalWords.value = uniqueWords.length;
    stats.value.total = uniqueWords.length;

    try {
      // Шаг 1: Проверка существующих слов
      const { existing, missing } = await checkWords(uniqueWords);

      // Помечаем существующие слова как пропущенные
      existing.forEach((word) => {
        results.value.push({
          word,
          status: 'skipped',
        });
        stats.value.skipped++;
        stats.value.processed++;
        progress.value++;
      });

      // Если все слова уже в словаре
      if (missing.length === 0) {
        isProcessing.value = false;
        return;
      }

      // Шаг 2: Обработка отсутствующих слов
      for (const word of missing) {
        // Проверка отмены
        if (isCancelled.value) {
          // Помечаем оставшиеся слова как отмененные
          const currentIndex = missing.indexOf(word);
          if (currentIndex !== -1) {
            const remainingWords = missing.slice(currentIndex);
            remainingWords.forEach((w) => {
              results.value.push({
                word: w,
                status: 'error',
                error: 'Cancelled',
              });
            });
          }
          break;
        }

        currentWord.value = word;

        // Добавляем слово в результаты как обрабатываемое
        const resultIndex = results.value.length;
        results.value.push({
          word,
          status: 'processing',
        });

        // Обработка слова
        const status = await processWord(word);

        // Обновляем результат
        if (results.value[resultIndex]) {
          results.value[resultIndex].status = status;

          if (status === 'success') {
            stats.value.added++;
          } else {
            stats.value.errors++;
            results.value[resultIndex].error = 'Generation failed';
          }
        }

        stats.value.processed++;
        progress.value++;

        // Задержка между запросами (1 секунда)
        if (progress.value < totalWords.value && !isCancelled.value) {
          await delay(1000);
        }
      }
    } finally {
      isProcessing.value = false;
      currentWord.value = '';
    }
  }

  return {
    isProcessing: readonly(isProcessing),
    isCancelled: readonly(isCancelled),
    currentWord: readonly(currentWord),
    progress: readonly(progress),
    totalWords: readonly(totalWords),
    results: readonly(results),
    stats: readonly(stats),
    processBatch,
    cancel,
    reset,
  };
}
