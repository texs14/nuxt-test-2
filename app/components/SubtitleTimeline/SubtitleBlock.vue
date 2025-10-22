<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useTimelineCalculations } from '~/composables/controls/useTimelineCalculations';

// TypeScript interfaces
interface SubtitleObject {
  id: string | number;
  start: number;
  end: number;
  text: string;
}

interface SubtitleBlockProps {
  subtitle: SubtitleObject;
  zoomLevel: number;
  isSelected?: boolean;
  duration?: number;
  otherSubtitles?: SubtitleObject[];
  allowCollisions?: boolean;
}

// Props definition
const props = withDefaults(defineProps<SubtitleBlockProps>(), {
  isSelected: false,
  duration: Infinity,
  otherSubtitles: () => [],
  allowCollisions: false,
});

// Emits definition
const emit = defineEmits<{
  click: [subtitle: SubtitleObject];
  'timing-change': [payload: { id: string | number; start: number; end: number }];
}>();

// Timeline calculations composable
const { timeToPixels, pixelsToTime } = useTimelineCalculations();

// Block dimensions
const BLOCK_HEIGHT = 45;
const MIN_BLOCK_WIDTH = 20;

// Drag state
const isDragging = ref(false);
const dragStartX = ref(0);
const dragStartTime = ref({ start: 0, end: 0 });
const tempStartTime = ref<number | null>(null);
const tempEndTime = ref<number | null>(null);
const hasCollision = ref(false);

// Calculate block position and dimensions
const blockLeft = computed(() => {
  const start = tempStartTime.value !== null ? tempStartTime.value : props.subtitle.start;
  return timeToPixels(start, props.zoomLevel);
});

const blockWidth = computed(() => {
  const start = tempStartTime.value !== null ? tempStartTime.value : props.subtitle.start;
  const end = tempEndTime.value !== null ? tempEndTime.value : props.subtitle.end;
  const duration = end - start;
  const width = timeToPixels(duration, props.zoomLevel);
  return Math.max(width, MIN_BLOCK_WIDTH);
});

const blockStyle = computed(() => ({
  left: `${blockLeft.value}px`,
  width: `${blockWidth.value}px`,
  height: `${BLOCK_HEIGHT}px`,
}));

// Block classes
const blockClasses = computed(() => [
  'subtitle-timeline__block',
  {
    'subtitle-timeline__block_selected': props.isSelected,
    'subtitle-timeline__block_dragging': isDragging.value,
    'subtitle-timeline__block_collision': hasCollision.value,
  },
]);

// Handle block click
const handleClick = () => {
  if (!isDragging.value) {
    emit('click', props.subtitle);
  }
};

// Drag handlers
const handleMouseDown = (event: MouseEvent) => {
  event.preventDefault();
  event.stopPropagation();

  isDragging.value = true;
  dragStartX.value = event.clientX;
  dragStartTime.value = {
    start: props.subtitle.start,
    end: props.subtitle.end,
  };

  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
};

// Check for collision with other subtitles
const checkCollision = (start: number, end: number): boolean => {
  if (props.allowCollisions || props.otherSubtitles.length === 0) {
    return false;
  }

  return props.otherSubtitles.some((other) => {
    // Skip checking against itself
    if (other.id === props.subtitle.id) return false;

    // Collision condition: (newStart < otherEnd) && (newEnd > otherStart)
    return start < other.end && end > other.start;
  });
};

// Find nearest non-colliding position
const findNearestValidPosition = (start: number, end: number): { start: number; end: number } => {
  const duration = end - start;
  const GAP = 0.1; // 100ms gap between subtitles

  // Sort other subtitles by start time
  const sorted = [...props.otherSubtitles]
    .filter((s) => s.id !== props.subtitle.id)
    .sort((a, b) => a.start - b.start);

  // Try to find a gap
  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];

    // Check if we can fit before this subtitle
    const potentialEnd = current.start - GAP;
    const potentialStart = potentialEnd - duration;

    if (potentialStart >= 0) {
      // Check if this position collides with previous subtitle
      const prevSubtitle = i > 0 ? sorted[i - 1] : null;
      if (!prevSubtitle || potentialStart >= prevSubtitle.end + GAP) {
        return { start: potentialStart, end: potentialEnd };
      }
    }
  }

  // If no gap found, snap to end of last subtitle
  if (sorted.length > 0) {
    const last = sorted[sorted.length - 1];
    const snapStart = last.end + GAP;
    const snapEnd = snapStart + duration;

    if (snapEnd <= props.duration) {
      return { start: snapStart, end: snapEnd };
    }
  }

  // Fallback: keep original position
  return { start: props.subtitle.start, end: props.subtitle.end };
};

const handleMouseMove = (event: MouseEvent) => {
  if (!isDragging.value) return;

  const deltaX = event.clientX - dragStartX.value;
  const deltaTime = pixelsToTime(Math.abs(deltaX), props.zoomLevel);
  const timeOffset = deltaX >= 0 ? deltaTime : -deltaTime;

  const duration = dragStartTime.value.end - dragStartTime.value.start;
  let newStart = dragStartTime.value.start + timeOffset;
  let newEnd = dragStartTime.value.end + timeOffset;

  // Constrain to timeline boundaries
  if (newStart < 0) {
    newStart = 0;
    newEnd = duration;
  }
  if (newEnd > props.duration) {
    newEnd = props.duration;
    newStart = props.duration - duration;
  }

  // Check for collision
  const collision = checkCollision(newStart, newEnd);
  hasCollision.value = collision;

  // If collision detected and not allowed, optionally auto-adjust
  if (collision && !props.allowCollisions) {
    // For now, just show warning. Auto-adjustment can be enabled with a prop later
    // const adjusted = findNearestValidPosition(newStart, newEnd);
    // newStart = adjusted.start;
    // newEnd = adjusted.end;
  }

  tempStartTime.value = newStart;
  tempEndTime.value = newEnd;
};

const handleMouseUp = () => {
  if (!isDragging.value) return;

  isDragging.value = false;

  // Emit timing change if position actually changed and no collision (or collisions allowed)
  if (tempStartTime.value !== null && tempEndTime.value !== null) {
    const hasChanged =
      Math.abs(tempStartTime.value - props.subtitle.start) > 0.01 ||
      Math.abs(tempEndTime.value - props.subtitle.end) > 0.01;

    // Only emit if changed and either no collision or collisions are allowed
    if (hasChanged && (!hasCollision.value || props.allowCollisions)) {
      emit('timing-change', {
        id: props.subtitle.id,
        start: tempStartTime.value,
        end: tempEndTime.value,
      });
    }
  }

  // Reset temp values and collision state
  tempStartTime.value = null;
  tempEndTime.value = null;
  hasCollision.value = false;

  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
};

// Cleanup on unmount
onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
});
</script>

<template>
  <div
    :class="blockClasses"
    :style="blockStyle"
    @click="handleClick"
    @mousedown="handleMouseDown"
  >
    <span class="subtitle-timeline__block-text">
      {{ subtitle.text }}
    </span>
  </div>
</template>

<style scoped>
.subtitle-timeline__block {
  position: absolute;
  top: 80px;
  background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
  border: 2px solid #4338ca;
  border-radius: 4px;
  cursor: grab;
  user-select: none;
  display: flex;
  align-items: center;
  padding: 0 8px;
  overflow: hidden;
  transition:
    opacity 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.subtitle-timeline__block:hover {
  opacity: 0.9;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  border-color: #6366f1;
}

.subtitle-timeline__block_selected {
  border: 3px solid #10b981;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
  z-index: 3;
}

.subtitle-timeline__block_selected:hover {
  border-color: #10b981;
}

.subtitle-timeline__block_dragging {
  cursor: grabbing;
  opacity: 0.7;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
  z-index: 4;
}

.subtitle-timeline__block_collision {
  border-color: #ef4444;
  border-width: 3px;
  background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);
  box-shadow: 0 4px 16px rgba(239, 68, 68, 0.5);
  animation: collision-pulse 0.6s ease-in-out infinite;
}

@keyframes collision-pulse {
  0%,
  100% {
    opacity: 0.7;
  }
  50% {
    opacity: 0.5;
  }
}

.subtitle-timeline__block_collision.subtitle-timeline__block_dragging {
  opacity: 0.6;
}

.subtitle-timeline__block-text {
  color: white;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}
</style>
