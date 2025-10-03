import type { Ref } from 'vue';
import { computed, ref, watch } from 'vue';
import type { NormalizedSubtitle } from '~/types/video.types';

/**
 * Определение активного субтитра на основе текущего времени
 */
export const useActiveSubtitle = (
  subtitles: Ref<NormalizedSubtitle[]>,
  currentTime: Ref<number>
) => {
  const activeIndex = computed(() => {
    const t = currentTime.value;
    return subtitles.value.findIndex((s: any) => t >= s.start && t < s.end);
  });

  const activeSubtitle = computed(() => subtitles.value[activeIndex.value] || null);

  // Запоминаем последний показанный субтитр, чтобы не пропадал между паузами
  const lastSubtitle = ref<NormalizedSubtitle | null>(null);
  watch(activeSubtitle, (val: any) => {
    if (val) lastSubtitle.value = val;
  });

  return {
    activeIndex,
    activeSubtitle,
    lastSubtitle,
  };
};
