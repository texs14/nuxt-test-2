<template>
  <div :class="rootClasses" role="group" aria-label="Панель управления видео">
    <PlayButton :playing="playing" @toggle="$emit('toggle-play')" />

    <VideoTimeline
      v-if="!hideTimeline"
      :current-time="currentTime"
      :duration="duration"
      @seek="$emit('seek', $event)"
    />

    <VolumeControl :volume="volume" @set-volume="$emit('set-volume', $event)" />

    <FullscreenButton @toggle="$emit('toggle-fullscreen')" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import PlayButton from './VideoControls/PlayButton.vue';
import VideoTimeline from './VideoControls/VideoTimeline.vue';
import VolumeControl from './VideoControls/VolumeControl.vue';
import FullscreenButton from './VideoControls/FullscreenButton.vue';

const props = defineProps<{
  playing: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  hideTimeline?: boolean;
}>();

defineEmits<{
  (e: 'toggle-play'): void;
  (e: 'seek', time: number): void;
  (e: 'toggle-fullscreen'): void;
  (e: 'set-volume', value: number): void;
}>();

const hideTimeline = computed(() => Boolean(props.hideTimeline));
const rootClasses = computed(() => ({
  'video-controls': true,
  'video-controls_timeline-hidden': hideTimeline.value,
}));
</script>

<style scoped lang="scss">
.video-controls {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(22, 22, 22, 0.75);
  color: #fff;
  backdrop-filter: saturate(140%) blur(6px);

  z-index: 9;

  &__btn {
    appearance: none;
    border: 1px solid rgba(255, 255, 255, 0.25);
    background: rgba(40, 40, 40, 0.7);
    color: #fff;
    padding: 6px 10px;
    border-radius: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  &__time {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }
  &__time_current,
  &__time_total {
    font-variant-numeric: tabular-nums;
    opacity: 0.95;
  }

  &__track {
    position: relative;
    height: 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
  }
  &__track_bar {
    position: relative;
    width: 100%;
    height: 6px;
    background: rgba(255, 255, 255, 0.25);
    border-radius: 999px;
    overflow: hidden;
  }
  &__track_progress {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    background: #3b82f6;
    width: 0%;
  }
  &__track_thumb {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 14px;
    height: 14px;
    background: #fff;
    border: 2px solid #3b82f6;
    border-radius: 50%;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
    pointer-events: none;
  }

  &__volume {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 36px;
  }
  &__volume_btn {
    appearance: none;
    border: 1px solid rgba(255, 255, 255, 0.25);
    background: rgba(40, 40, 40, 0.7);
    color: #fff;
    padding: 6px 10px;
    border-radius: 8px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  &__volume_icon {
    opacity: 0.95;
  }
  &__volume_popup {
    position: absolute;
    bottom: 44px;
    left: 50%;
    transform: translateX(-50%);
    padding: 10px;
    border-radius: 10px;
    background: rgba(22, 22, 22, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.2);
    backdrop-filter: saturate(140%) blur(6px);
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;
    z-index: 5;
    width: 56px;
    height: 180px;
    display: grid;
    place-items: center;
  }
  &__volume_popup_visible {
    opacity: 1;
    pointer-events: auto;
  }
  &__volume_slider {
    transform: rotate(-90deg) translateY(-265%);
    width: 160px;
    height: 20px;
  }

  &__root_timeline-hidden {
    grid-template-columns: 3fr auto auto;

    .video-controls__btn_play {
      width: 100%;
      display: flex;
      justify-content: center;
    }
  }
}
</style>
