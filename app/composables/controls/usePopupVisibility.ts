import { ref, onBeforeUnmount } from 'vue';

/**
 * Управление видимостью popup (для volume control)
 */
export const usePopupVisibility = (hoverDelay = 1000, touchDelay = 6000) => {
  const visible = ref(false);
  let hideTimer: number | null = null;

  const clearTimer = () => {
    if (hideTimer) {
      window.clearTimeout(hideTimer);
      hideTimer = null;
    }
  };

  const show = () => {
    visible.value = true;
    clearTimer();
  };

  const hide = () => {
    visible.value = false;
    clearTimer();
  };

  const scheduleHide = (delay: number) => {
    clearTimer();
    hideTimer = window.setTimeout(() => {
      visible.value = false;
      hideTimer = null;
    }, delay);
  };

  const onMouseEnter = () => {
    show();
  };

  const onMouseLeave = () => {
    scheduleHide(hoverDelay);
  };

  const toggle = () => {
    visible.value = !visible.value;
    clearTimer();
    if (visible.value) {
      scheduleHide(touchDelay);
    }
  };

  onBeforeUnmount(() => {
    clearTimer();
  });

  return {
    visible,
    show,
    hide,
    toggle,
    onMouseEnter,
    onMouseLeave,
  };
};
