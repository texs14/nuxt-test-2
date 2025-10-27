<template>
  <div class="video-controls">
    <UIButton
      v-if="!playing"
      class="video-controls__overlay-button"
      aria-label="Старт"
      size="lg"
      variant="secondary"
      @click="$emit('toggle-play')"
    >
      <PlayIcon :size="28" />
    </UIButton>

    <div :class="panelClasses" role="group" aria-label="Панель управления видео">
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
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import UIButton from '~/components/ui/UIButton.vue';
import PlayIcon from '~/components/ui/icons/PlayIcon.vue';
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
const panelClasses = computed(() => ({
  'video-controls__panel': true,
  'video-controls__panel_timeline-hidden': hideTimeline.value,
}));
</script>

<style scoped lang="scss">
.video-controls {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;

  &__overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__overlay-button {
    pointer-events: auto;
    width: 72px;
    height: 72px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    background: rgba(22, 22, 22, 0.85);
    color: #fff;
    backdrop-filter: saturate(140%) blur(6px);

    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  &__panel {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
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
    pointer-events: auto;
    z-index: 9;
    box-sizing: border-box;
  }

  &__panel_timeline-hidden {
    grid-template-columns: 3fr auto auto;

    .video-controls__btn_play {
      width: 100%;
      display: flex;
      justify-content: center;
    }
  }
}
</style>
