import type { Ref } from 'vue';
import { ref, onMounted, onBeforeUnmount } from 'vue';

/**
 * Управление полноэкранным режимом
 */
export const useFullscreen = (elementRef: Ref<HTMLElement | null>) => {
  const isFullscreen = ref(false);

  const onFsChange = () => {
    isFullscreen.value = !!document.fullscreenElement;
  };

  const enterFullscreen = async () => {
    const element = elementRef.value;
    if (!element) return;
    try {
      if (!document.fullscreenElement) {
        await element.requestFullscreen?.();
      }
    } catch {
      // ignore
    }
  };

  const exitFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen?.();
      }
    } catch {
      // ignore
    }
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await enterFullscreen();
    } else {
      await exitFullscreen();
    }
  };

  onMounted(() => {
    document.addEventListener('fullscreenchange', onFsChange);
  });

  onBeforeUnmount(() => {
    document.removeEventListener('fullscreenchange', onFsChange);
  });

  return {
    isFullscreen,
    toggleFullscreen,
    enterFullscreen,
    exitFullscreen,
  };
};
