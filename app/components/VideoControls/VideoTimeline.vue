<template>
  <div class="video-timeline">
    <span class="video-timeline__time video-timeline__time_current">
      {{ formatTime(currentTime) }}
    </span>
    <div
      ref="trackRef"
      class="video-timeline__track"
      role="slider"
      :aria-valuemin="0"
      :aria-valuemax="duration"
      :aria-valuenow="clampedTime"
      tabindex="0"
      @click="onTrackClick"
      @mousedown.prevent="onDragStart"
      @touchstart.prevent="onDragStartTouch"
    >
      <div class="video-timeline__track_bar">
        <div class="video-timeline__track_progress" :style="{ width: progress + '%' }" />
        <div class="video-timeline__track_thumb" :style="{ left: progress + '%' }" />
      </div>
    </div>
    <span class="video-timeline__time video-timeline__time_total">
      {{ formatTime(duration) }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useTimelineDrag } from '~/composables/controls/useTimelineDrag';
import { formatTime } from '~/utils/time';

const props = defineProps<{
  currentTime: number;
  duration: number;
}>();

const emit = defineEmits<{
  (e: 'seek', time: number): void;
}>();

const trackRef = ref<HTMLDivElement | null>(null);

const clampedTime = computed(() =>
  Math.max(0, Math.min(props.currentTime || 0, props.duration || 0))
);

const progress = computed(() => {
  if (!props.duration) return 0;
  return Math.min(100, Math.max(0, (clampedTime.value / props.duration) * 100));
});

const { onTrackClick, onDragStart, onDragStartTouch } = useTimelineDrag(
  trackRef,
  computed(() => props.duration),
  (time) => emit('seek', time)
);
</script>

<style scoped lang="scss">
.video-timeline {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  min-width: 0;

  &__time {
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
}
</style>
