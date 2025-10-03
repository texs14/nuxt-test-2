import { ref, onBeforeUnmount } from 'vue';

/**
 * Универсальный хук для автоматического скрытия элементов
 */
export const useAutoHide = (defaultVisible = false, defaultDelay = 3000) => {
  const visible = ref(defaultVisible);
  let hideTimer: number | null = null;

  const show = () => {
    visible.value = true;
    if (hideTimer) {
      window.clearTimeout(hideTimer);
      hideTimer = null;
    }
  };

  const hide = () => {
    visible.value = false;
    if (hideTimer) {
      window.clearTimeout(hideTimer);
      hideTimer = null;
    }
  };

  const scheduleHide = (ms: number = defaultDelay) => {
    if (hideTimer) window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => {
      visible.value = false;
      hideTimer = null;
    }, ms);
  };

  const onMouseEnter = () => {
    show();
  };

  const onMouseMove = () => {
    show();
  };

  const onMouseLeave = () => {
    scheduleHide(3000);
  };

  const onTouchStart = () => {
    show();
    scheduleHide(5000);
  };

  onBeforeUnmount(() => {
    if (hideTimer) window.clearTimeout(hideTimer);
  });

  return {
    visible,
    show,
    hide,
    scheduleHide,
    onMouseEnter,
    onMouseMove,
    onMouseLeave,
    onTouchStart,
  };
};
