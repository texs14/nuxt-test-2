import type { Ref } from 'vue';
import { ref, onMounted } from 'vue';

/**
 * Основная логика воспроизведения видео
 */
export const useVideoPlayback = (videoRef: Ref<HTMLVideoElement | null>) => {
  const currentTime = ref(0);
  const duration = ref(0);
  const isPlaying = ref(false);
  const volume = ref(1);

  const playWithCatch = (element: HTMLVideoElement) => {
    const promise = element.play();
    promise?.catch(() => undefined);
  };

  const play = () => {
    const el = videoRef.value;
    if (!el) return;
    playWithCatch(el);
  };

  const pause = () => {
    const el = videoRef.value;
    if (!el) return;
    el.pause();
  };

  const togglePlay = () => {
    const el = videoRef.value;
    if (!el) return;
    if (el.paused) {
      playWithCatch(el);
    } else {
      el.pause();
    }
  };

  const setVolume = (v: number) => {
    const el = videoRef.value;
    if (!el) return;
    el.volume = Math.max(0, Math.min(1, v));
    volume.value = el.volume;
  };

  const seekToTime = (time: number) => {
    const el = videoRef.value;
    if (!el) return;
    const wasPlaying = !el.paused;
    const durationLimit = el.duration || Number.MAX_SAFE_INTEGER;
    const limited = Math.max(0, Math.min(time, durationLimit));
    el.currentTime = limited;
    if (wasPlaying) playWithCatch(el);
    else el.pause();
  };

  // Event handlers
  const onTimeUpdate = (e: Event) => {
    const el = e.target as HTMLVideoElement;
    currentTime.value = el.currentTime;
  };

  const onLoadedMetadata = () => {
    const el = videoRef.value;
    if (!el) return;
    duration.value = Number.isFinite(el.duration) ? el.duration : 0;
    volume.value = el.volume;
  };

  const onDurationChange = () => {
    const el = videoRef.value;
    if (!el) return;
    duration.value = Number.isFinite(el.duration) ? el.duration : 0;
  };

  const onPlay = () => {
    isPlaying.value = true;
  };

  const onPause = () => {
    isPlaying.value = false;
  };

  // Начальная инициализация
  onMounted(() => {
    if (videoRef.value) {
      duration.value = Number.isFinite(videoRef.value.duration) ? videoRef.value.duration : 0;
      volume.value = videoRef.value.volume;
    }
  });

  return {
    // State
    currentTime,
    duration,
    isPlaying,
    volume,

    // Methods
    play,
    pause,
    togglePlay,
    setVolume,
    seekToTime,

    // Event handlers
    onTimeUpdate,
    onLoadedMetadata,
    onDurationChange,
    onPlay,
    onPause,
  };
};
