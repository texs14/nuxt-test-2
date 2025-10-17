export interface ThaiSentences {
  sentences: string[][];
}

/**
 * Сегментация тайского текста на слова
 * Если текст содержит пробелы, разделяет по ним, иначе возвращает как одно слово
 */
export function segmentThaiWords(text: string): string[] {
  const normalized = text.replace(/\s+/gu, ' ').trim();
  if (!normalized) return [];

  const bySpace = normalized.split(' ').filter(Boolean);
  if (bySpace.length > 1) return bySpace;

  return [normalized];
}

/**
 * Удаляет пробелы между тайскими буквами
 */
export function sanitizeThaiSpacing(text: string): string {
  if (!text) return '';

  let out = text;
  const re = /([\u0E00-\u0E7F])\s+([\u0E00-\u0E7F])/g;

  for (let i = 0; i < 5; i++) {
    const next = out.replace(re, '$1$2');
    if (next === out) break;
    out = next;
  }

  return out;
}

/**
 * Преобразует структуру ThaiSentences в плоскую строку с тройными пробелами между предложениями
 */
export function flattenThaiSentences(value: ThaiSentences | undefined): string {
  if (!value || !Array.isArray(value.sentences)) return '';

  return value.sentences
    .map((sentence) =>
      sentence
        .map((word) => word.trim())
        .filter(Boolean)
        .join(' ')
    )
    .filter((sentence) => sentence.length > 0)
    .join('   ');
}

/**
 * Подготавливает тайский текст для отображения в редакторе
 * Если это объект ThaiSentences - сплющивает, если строка - сегментирует
 */
export function prepareThaiEditorValue(value: string | ThaiSentences | undefined): string {
  if (!value) return '';
  if (typeof value === 'object') return flattenThaiSentences(value);
  return segmentThaiWords(value).join(' ');
}

/**
 * Нормализует тайский текст для редактора
 * Убирает переносы строк, табы, лишние пробелы
 */
export function normalizeThaiEditorValue(text: string): string {
  if (!text) return '';

  const cleaned = text
    .replace(/\r?\n/gu, ' ')
    .replace(/\u00A0/gu, ' ')
    .replace(/\t+/gu, ' ')
    .replace(/ {4,}/gu, '   ')
    .trim();

  return cleaned;
}

/**
 * Преобразует текст редактора в структуру ThaiSentences для сохранения
 * Предложения разделяются 3+ пробелами или точками
 * Слова в предложении разделяются одинарными пробелами
 */
export function buildThaiSentencesPayload(
  value: string | ThaiSentences | undefined
): ThaiSentences {
  if (!value) return { sentences: [] };

  // Если уже объект - нормализуем и возвращаем
  if (typeof value === 'object') {
    return {
      sentences: (value.sentences ?? [])
        .map((sentence) => sentence.map((word) => word.trim()).filter(Boolean))
        .filter((sentence) => sentence.length > 0),
    };
  }

  // Нормализуем строку
  const normalized = value
    .replace(/\r?\n/gu, ' ')
    .replace(/\u00A0/gu, ' ')
    .trim();

  if (!normalized) return { sentences: [] };

  // Разделяем на предложения (3+ пробела или точка)
  const rawSentences = normalized
    .split(/(?:\s{3,}|\.)\s*/gu)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  // Разделяем предложения на слова
  const sentences = rawSentences
    .map((sentence) => {
      if (sentence.includes(' ')) {
        return sentence
          .split(/\s+/gu)
          .map((word) => word.trim())
          .filter(Boolean);
      }
      return [sentence];
    })
    .filter((words) => words.length > 0);

  return { sentences };
}

/**
 * Объединяет все функции обработки тайского текста в один composable
 */
export function useThaiTextProcessing() {
  return {
    segmentThaiWords,
    sanitizeThaiSpacing,
    flattenThaiSentences,
    prepareThaiEditorValue,
    normalizeThaiEditorValue,
    buildThaiSentencesPayload,
  };
}
