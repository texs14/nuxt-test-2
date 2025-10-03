import type { Ref } from 'vue';
import { ref, computed, watch } from 'vue';
import type { PlaybackRange } from '~/types/video.types';

const RANGE_EPSILON = 0.05;

/**
 * Ограничение диапазона воспроизведения
 */
export const useRestrictedRange = (
  videoRef: Ref<HTMLVideoElement | null>,
  range: Ref<PlaybackRange | null | undefined>,
  currentTime: Ref<number>,
  isPlaying: Ref<boolean>
) => {
  const rangeEnded = ref(false);

  const restrictedRange = computed<PlaybackRange | null>(() => {
    const rangeValue = range.value;
    if (!rangeValue) return null;
    const start = Number(rangeValue.start);
    const end = Number(rangeValue.end);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
    const normalizedStart = Math.max(0, start);
    const normalizedEnd = Math.max(0, end);
    if (normalizedEnd <= normalizedStart) return null;
    return { start: normalizedStart, end: normalizedEnd };
  });

  const clampToRange = (time: number): number => {
    const rangeValue = restrictedRange.value;
    if (!rangeValue) return time;
    if (time < rangeValue.start) return rangeValue.start;
    if (time > rangeValue.end) return rangeValue.end;
    return time;
  };

  /**
   * Обработка ограничения диапазона при onTimeUpdate
   */
  const handleRangeRestriction = (el: HTMLVideoElement): boolean => {
    if (!restrictedRange.value) return false;

    const { start, end } = restrictedRange.value;
    if (el.currentTime < start - RANGE_EPSILON) {
      el.currentTime = start;
      currentTime.value = start;
      rangeEnded.value = false;
      return true;
    }
    if (el.currentTime >= end - RANGE_EPSILON) {
      el.currentTime = end;
      currentTime.value = end;
      if (!el.paused) el.pause();
      rangeEnded.value = true;
      return true;
    }
    return false;
  };

  /**
   * Обработка начала воспроизведения с учетом ограничения
   */
  const handlePlayWithRange = (el: HTMLVideoElement) => {
    if (!restrictedRange.value) return;
    const { start, end } = restrictedRange.value;
    if (rangeEnded.value || el.currentTime < start || el.currentTime >= end) {
      el.currentTime = start;
      rangeEnded.value = false;
    }
  };

  // Сброс при изменении диапазона
  watch(restrictedRange, (rangeValue) => {
    const el = videoRef.value;
    rangeEnded.value = false;
    if (!el || !rangeValue) return;
    el.currentTime = rangeValue.start;
    el.pause();
    isPlaying.value = false;
  });

  return {
    restrictedRange,
    rangeEnded,
    clampToRange,
    handleRangeRestriction,
    handlePlayWithRange,
  };
};
