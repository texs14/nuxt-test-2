import type { Ref } from 'vue';
import { computed } from 'vue';
import type { NormalizedSubtitle, PlaybackRange } from '~/types/video.types';

/**
 * Навигация по субтитрам (prev/next)
 */
export const useSubtitleNavigation = (
  videoRef: Ref<HTMLVideoElement | null>,
  subtitles: Ref<NormalizedSubtitle[]>,
  activeIndex: Ref<number>,
  currentTime: Ref<number>,
  lastSubtitle: Ref<NormalizedSubtitle | null>,
  restrictedRange: Ref<PlaybackRange | null>,
  rangeEnded: Ref<boolean>
) => {
  const playWithCatch = (element: HTMLVideoElement) => {
    const promise = element.play();
    promise?.catch(() => undefined);
  };

  const clampToRange = (time: number) => {
    const range = restrictedRange.value;
    if (!range) return time;
    if (time < range.start) return range.start;
    if (time > range.end) return range.end;
    return time;
  };

  /**
   * Переход к субтитру по индексу
   */
  const seekTo = (index: number) => {
    const el = videoRef.value;
    const s = subtitles.value[index];
    if (!el || !s) return;
    const wasPlaying = !el.paused;
    const target = clampToRange(Math.max(s.start + 0.01, 0));
    el.currentTime = target;
    if (restrictedRange.value) rangeEnded.value = false;
    if (wasPlaying) {
      playWithCatch(el);
    } else {
      el.pause();
    }
  };

  /**
   * Переход к предыдущему субтитру
   */
  const goPrev = () => {
    const el = videoRef.value;
    if (!el) return;
    const idx = activeIndex.value;
    if (idx >= 0) {
      const s = subtitles.value[idx];
      if (!s) return;
      const elapsed = currentTime.value - s.start;
      // Если прошло больше 1.5 секунд с начала субтитра — переключаемся на него
      if (elapsed > 1.5) {
        const wasPlaying = !el.paused;
        el.currentTime = Math.max(s.start + 0.01, 0);
        if (wasPlaying) {
          playWithCatch(el);
        } else {
          el.pause();
        }
      } else {
        const prevIndex = idx - 1;
        if (prevIndex >= 0) {
          seekTo(prevIndex);
        } else {
          // Нет предыдущего — остаёмся на первом и перезапускаем его
          const first = subtitles.value[0];
          if (first) {
            const wasPlaying = !el.paused;
            el.currentTime = Math.max(first.start + 0.01, 0);
            if (wasPlaying) {
              playWithCatch(el);
            } else {
              el.pause();
            }
          }
        }
      }
    } else {
      // Вне активного субтитра
      const subs = subtitles.value;
      if (!subs.length) return;
      const last = subs[subs.length - 1];
      const first = subs[0];
      if (!last || !first) return;
      if (currentTime.value >= last.end) {
        const wasPlaying = !el.paused;
        el.currentTime = Math.max(last.start + 0.01, 0);
        if (wasPlaying) {
          playWithCatch(el);
        } else {
          el.pause();
        }
      } else if (currentTime.value < first.start) {
        seekTo(0);
      } else {
        const ls = lastSubtitle.value;
        if (ls) {
          const wasPlaying = !el.paused;
          el.currentTime = Math.max(ls.start + 0.01, 0);
          if (wasPlaying) {
            playWithCatch(el);
          } else {
            el.pause();
          }
        }
      }
    }
  };

  /**
   * Переход к следующему субтитру
   */
  const goNext = () => {
    if (!hasNext.value) return;
    seekTo(activeIndex.value + 1);
  };

  const hasPrev = computed(() => {
    const subs = subtitles.value;
    if (!subs.length) return false;
    const idx = activeIndex.value;
    if (idx > 0) return true;
    const first = subs[0];
    const last = subs[subs.length - 1];
    // После последнего субтитра кнопка активна, чтобы вернуться к его началу
    if (last && currentTime.value >= last.end) return true;
    // Во время первого субтитра — активна, если уже прошёл его старт
    if (idx === 0 && first && currentTime.value > first.start) return true;
    // В промежутках между субтитрами — активна, если есть последний показанный
    if (idx === -1 && lastSubtitle.value) return true;
    return false;
  });

  const hasNext = computed(() => {
    const subs = subtitles.value;
    const last = subs[subs.length - 1];
    if (!last) return false;
    // До старта последнего субтитра — можно вперёд; начиная с него и позже — нельзя
    return currentTime.value < last.start;
  });

  return {
    seekTo,
    goPrev,
    goNext,
    hasPrev,
    hasNext,
  };
};
