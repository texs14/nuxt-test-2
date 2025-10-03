import type { Ref } from 'vue';
import { computed } from 'vue';
import type { Token } from '~/types/video.types';

/**
 * Токенизация тайского текста для интерактивного отображения
 */
export const useSubtitleTokenization = (
  sentences: Ref<string[][]>,
  fallbackText: Ref<string>
) => {
  const tokens = computed<Token[]>(() => {
    const sentencesValue = sentences.value;

    // Если есть структурированные предложения
    if (sentencesValue.length) {
      const tokensList: Token[] = [];
      sentencesValue.forEach((sentence: string[], sentenceIndex: number) => {
        const filtered = sentence.filter((word) => Boolean(word && word.trim().length));
        filtered.forEach((word: string, wordIndex: number) => {
          const trimmed = word.trim();
          if (!trimmed) return;
          tokensList.push({
            id: `sentence-${sentenceIndex}-word-${wordIndex}`,
            value: trimmed,
            type: 'word',
          });
        });
        // Разделитель между предложениями
        if (sentenceIndex < sentencesValue.length - 1) {
          tokensList.push({
            id: `sentence-separator-${sentenceIndex}`,
            value: '',
            type: 'separator',
          });
        }
      });
      if (tokensList.length) return tokensList;
    }

    // Fallback: разбиваем текст на токены через regex
    const text = fallbackText.value;
    if (!text) return [];

    const fallbackParts = text.match(/(\p{L}+|\p{N}+|\s+|[^\p{L}\p{N}\s]+)/gu) ?? [text];
    return fallbackParts.map((value: any, idx: any) => ({
      id: `fallback-${idx}`,
      value,
      type: /\s+/u.test(value) ? 'separator' : 'word',
    }));
  });

  return {
    tokens,
  };
};
