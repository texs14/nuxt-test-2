import type { Ref } from 'vue';
import { ref, watch } from 'vue';

/**
 * Integration composable for synchronizing subtitle editor timeline with video playback
 * Provides bidirectional sync: video updates timeline, timeline controls video
 */
export interface UseSubtitleEditorSyncOptions {
  /** Video element reference */
  videoRef: Ref<HTMLVideoElement | null>;
  /** Current playback time from video */
  currentTime: Ref<number>;
  /** Video duration */
  duration: Ref<number>;
  /** Video playing state */
  isPlaying: Ref<boolean>;
  /** Seek function from video playback composable */
  seekToTime: (time: number) => void;
  /** Pause function from video playback composable */
  pause: () => void;
  /** Play function from video playback composable */
  play: () => void;
}

export const useSubtitleEditorSync = (options: UseSubtitleEditorSyncOptions) => {
  const { videoRef, currentTime, duration, isPlaying, seekToTime, pause, play } = options;

  // Track whether user is manually interacting with timeline (to prevent auto-scroll interference)
  const isUserInteracting = ref(false);
  const lastUserInteractionTime = ref(0);

  /**
   * Handle timeline click - seek video to clicked position and pause
   */
  const handleTimelineClick = (time: number) => {
    seekToTime(time);
    pause();
    markUserInteraction();
  };

  /**
   * Handle subtitle selection - jump to subtitle start time and pause for editing
   */
  const handleSubtitleSelect = (subtitle: { start: number; end: number }) => {
    seekToTime(subtitle.start);
    pause();
    markUserInteraction();
  };

  /**
   * Mark that user is interacting with timeline (prevents auto-scroll)
   */
  const markUserInteraction = () => {
    isUserInteracting.value = true;
    lastUserInteractionTime.value = Date.now();

    // Clear interaction flag after 2 seconds
    setTimeout(() => {
      if (Date.now() - lastUserInteractionTime.value >= 2000) {
        isUserInteracting.value = false;
      }
    }, 2000);
  };

  /**
   * Resume playback (for UI controls)
   */
  const resumePlayback = () => {
    play();
  };

  /**
   * Pause playback (called when edit panel opens)
   */
  const pauseForEditing = () => {
    pause();
  };

  return {
    // State
    currentTime,
    duration,
    isPlaying,
    isUserInteracting,

    // Event handlers
    handleTimelineClick,
    handleSubtitleSelect,
    markUserInteraction,

    // Methods
    resumePlayback,
    pauseForEditing,
    seekToTime,
  };
};
