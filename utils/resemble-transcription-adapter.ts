import type { ResembleTranscriptionWord } from '~/types/resemble';
import type { SubtitleItem } from '~/app/types/video.types';

/**
 * Преобразует массив слов из Resemble.AI транскрибации в SubtitleItem[]
 * Группирует слова по speaker_id - при смене спикера начинается новая фраза
 *
 * @param words - Массив слов с временными метками и speaker_id
 * @returns Массив субтитров, где каждый элемент - фраза одного спикера
 */
export function convertResembleWordsToSubtitles(
  words: ResembleTranscriptionWord[]
): SubtitleItem[] {
  if (!words || words.length === 0) {
    return [];
  }

  const subtitles: SubtitleItem[] = [];
  let currentPhrase: ResembleTranscriptionWord[] = [];
  let currentSpeakerId: number | null = null;

  for (const word of words) {
    // Если спикер изменился, завершаем текущую фразу
    if (currentSpeakerId !== null && word.speaker_id !== currentSpeakerId) {
      if (currentPhrase.length > 0) {
        subtitles.push(createSubtitleFromWords(currentPhrase, subtitles.length + 1));
      }
      currentPhrase = [];
    }

    currentPhrase.push(word);
    currentSpeakerId = word.speaker_id;
  }

  // Добавляем последнюю фразу
  if (currentPhrase.length > 0) {
    subtitles.push(createSubtitleFromWords(currentPhrase, subtitles.length + 1));
  }

  return subtitles;
}

/**
 * Создает SubtitleItem из массива слов одной фразы
 * Начало фразы = start_time первого слова - 0.5 секунды
 * Конец фразы = end_time последнего слова
 *
 * @param words - Массив слов одной фразы
 * @param id - ID субтитра
 * @returns SubtitleItem с тайским текстом
 */
function createSubtitleFromWords(words: ResembleTranscriptionWord[], id: number): SubtitleItem {
  const firstWord = words[0];
  const lastWord = words[words.length - 1];

  return {
    id,
    // Вычитаем 0.5 секунды от начала, но не уходим в отрицательные значения
    start: Math.max(0, firstWord.start_time - 0.5),
    end: lastWord.end_time,
    text: {
      // Объединяем все слова через пробел
      th: words.map((w) => w.text).join(' '),
    },
  };
}
