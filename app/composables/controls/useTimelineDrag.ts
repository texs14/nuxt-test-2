import type { Ref } from 'vue';
import { ref, onBeforeUnmount } from 'vue';

/**
 * Логика drag&drop для timeline
 */
export const useTimelineDrag = (
  trackRef: Ref<HTMLElement | null>,
  duration: Ref<number>,
  onSeek: (time: number) => void
) => {
  let isDragging = false;
  let touchId: number | null = null;

  const onTrackClick = (e: MouseEvent) => {
    if (!trackRef.value || !duration.value) return;
    const rect = trackRef.value.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const t = Math.max(0, Math.min(duration.value, ratio * duration.value));
    onSeek(t);
  };

  const onDragMove = (e: MouseEvent) => {
    if (!isDragging || !trackRef.value || !duration.value) return;
    const rect = trackRef.value.getBoundingClientRect();
    const x = Math.max(rect.left, Math.min(e.clientX, rect.right));
    const ratio = (x - rect.left) / rect.width;
    onSeek(ratio * duration.value);
  };

  const onDragEnd = () => {
    isDragging = false;
    window.removeEventListener('mousemove', onDragMove);
    window.removeEventListener('mouseup', onDragEnd);
  };

  const onDragStart = (e: MouseEvent) => {
    if (!trackRef.value || !duration.value) return;
    isDragging = true;
    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('mouseup', onDragEnd);
    onDragMove(e);
  };

  const onTouchMove = (e: TouchEvent) => {
    if (touchId === null || !trackRef.value || !duration.value) return;
    const t = Array.from(e.changedTouches).find((x) => x.identifier === touchId);
    if (!t) return;
    const rect = trackRef.value.getBoundingClientRect();
    const x = Math.max(rect.left, Math.min(t.clientX, rect.right));
    const ratio = (x - rect.left) / rect.width;
    onSeek(ratio * duration.value);
  };

  const onTouchEnd = () => {
    touchId = null;
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('touchend', onTouchEnd);
  };

  const onDragStartTouch = (e: TouchEvent) => {
    if (!trackRef.value || !duration.value) return;
    const first = e.changedTouches && e.changedTouches.length > 0 ? e.changedTouches[0] : null;
    if (!first) return;
    touchId = first.identifier;
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    onTouchMove(e);
  };

  onBeforeUnmount(() => {
    onDragEnd();
    onTouchEnd();
  });

  return {
    onTrackClick,
    onDragStart,
    onDragStartTouch,
  };
};
