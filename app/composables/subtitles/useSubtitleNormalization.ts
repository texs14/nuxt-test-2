import type { Ref } from 'vue';
import { computed } from 'vue';
import type { SubtitleItem, NormalizedSubtitle, SubtitleText } from '~/types/video.types';

/**
 * Нормализует входные данные субтитров
 */
export const useSubtitleNormalization = (subtitles: Ref<SubtitleItem[] | null | undefined>) => {
  const normalizedSubtitles = computed<NormalizedSubtitle[]>(() => {
    const list = (subtitles.value ?? [])
      .filter((item: any): item is SubtitleItem => Boolean(item))
      .map((subtitle: any) => {
        const text: SubtitleText =
          typeof subtitle.text === 'string' ? { ru: subtitle.text } : (subtitle.text ?? {});

        return {
          id: subtitle.id ?? Math.random().toString(36).slice(2),
          start: Number(subtitle.start) || 0,
          end: Number(subtitle.end) || 0,
          text,
        } satisfies NormalizedSubtitle;
      })
      .sort((a: any, b: any) => a.start - b.start);

    return list;
  });

  return {
    normalizedSubtitles,
  };
};
