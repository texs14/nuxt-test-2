import { onMounted, onBeforeUnmount } from 'vue';

interface KeyboardCallbacks {
  onSpace?: () => void;
}

/**
 * Клавиатурные хоткеи для видео
 */
export const useVideoKeyboard = (callbacks: KeyboardCallbacks) => {
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      const target = e.target as HTMLElement | null;
      // Не перехватываем пробел в полях ввода
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      callbacks.onSpace?.();
    }
  };

  onMounted(() => {
    window.addEventListener('keydown', onKeyDown);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeyDown);
  });

  return {
    // можно расширить в будущем
  };
};
