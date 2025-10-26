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
  'snap-state': [payload: { active: boolean; targetTime: number | null }];
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

// Resize state
const isResizing = ref(false);
const resizeType = ref<'leading' | 'trailing' | null>(null);
const resizeStartX = ref(0);
const resizeStartTime = ref({ start: 0, end: 0 });
const constraintWarningShown = ref(false);

// Constants
const MIN_DURATION = 0.5; // seconds
const HANDLE_WIDTH = 8; // pixels
const SNAP_THRESHOLD = 0.1; // seconds

// Snap state
const snapState = ref<{
  active: boolean;
  type: 'start' | 'end' | null;
  targetTime: number | null;
}>({ active: false, type: null, targetTime: null });

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
    'subtitle-timeline__block_resizing': isResizing.value,
    'subtitle-timeline__block_collision': hasCollision.value,
    'subtitle-timeline__block_snapping': snapState.value.active,
  },
]);

// Handle classes
const leadingHandleClasses = computed(() => [
  'subtitle-block__resize-handle',
  'subtitle-block__resize-handle_leading',
  {
    'subtitle-block__resize-handle_active': isResizing.value && resizeType.value === 'leading',
  },
]);

const trailingHandleClasses = computed(() => [
  'subtitle-block__resize-handle',
  'subtitle-block__resize-handle_trailing',
  {
    'subtitle-block__resize-handle_active': isResizing.value && resizeType.value === 'trailing',
  },
]);

// Find adjacent subtitles
const adjacentSubtitles = computed(() => {
  const others = props.otherSubtitles.filter((s) => s.id !== props.subtitle.id);
  
  // Find previous subtitle: last one whose end time is <= current start time
  const prevCandidates = others
    .filter((s) => s.end <= props.subtitle.start)
    .sort((a, b) => b.end - a.end); // Sort descending by end time
  const prev = prevCandidates.length > 0 ? prevCandidates[0] : null;
  
  // Find next subtitle: first one whose start time is >= current end time
  const nextCandidates = others
    .filter((s) => s.start >= props.subtitle.end)
    .sort((a, b) => a.start - b.start); // Sort ascending by start time
  const next = nextCandidates.length > 0 ? nextCandidates[0] : null;
  
  return { prev, next };
});

// Handle block click
const handleClick = () => {
  if (!isDragging.value && !isResizing.value) {
    emit('click', props.subtitle);
  }
};

// Drag handlers
const handleMouseDown = (event: MouseEvent) => {
  // Only allow drag if not clicking on resize handle
  if ((event.target as HTMLElement).classList.contains('subtitle-block__resize-handle')) {
    return;
  }

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

  // Snap detection during drag
  snapState.value = { active: false, type: null, targetTime: null };
  
  if (!collision && adjacentSubtitles.value.prev) {
    const distanceToPrevEnd = Math.abs(newStart - adjacentSubtitles.value.prev.end);
    if (distanceToPrevEnd <= SNAP_THRESHOLD) {
      snapState.value = {
        active: true,
        type: 'start',
        targetTime: adjacentSubtitles.value.prev.end,
      };
    }
  }
  
  if (!collision && adjacentSubtitles.value.next) {
    const distanceToNextStart = Math.abs(newEnd - adjacentSubtitles.value.next.start);
    if (distanceToNextStart <= SNAP_THRESHOLD) {
      snapState.value = {
        active: true,
        type: 'end',
        targetTime: adjacentSubtitles.value.next.start,
      };
    }
  }
  
  // Emit snap state for visual guide
  emit('snap-state', {
    active: snapState.value.active,
    targetTime: snapState.value.targetTime,
  });

  tempStartTime.value = newStart;
  tempEndTime.value = newEnd;
};

const handleMouseUp = () => {
  if (!isDragging.value) return;

  isDragging.value = false;

  let finalStart = tempStartTime.value;
  let finalEnd = tempEndTime.value;

  // Apply snap if active
  if (snapState.value.active && snapState.value.targetTime !== null) {
    const duration = (finalEnd || props.subtitle.end) - (finalStart || props.subtitle.start);
    
    if (snapState.value.type === 'start') {
      // Snap start to previous subtitle end
      finalStart = snapState.value.targetTime;
      finalEnd = finalStart + duration;
    } else if (snapState.value.type === 'end') {
      // Snap end to next subtitle start
      finalEnd = snapState.value.targetTime;
      finalStart = finalEnd - duration;
    }
  }

  // Emit timing change if position actually changed and no collision (or collisions allowed)
  if (finalStart !== null && finalEnd !== null) {
    const hasChanged =
      Math.abs(finalStart - props.subtitle.start) > 0.01 ||
      Math.abs(finalEnd - props.subtitle.end) > 0.01;

    // Only emit if changed and either no collision or collisions are allowed
    if (hasChanged && (!hasCollision.value || props.allowCollisions)) {
      emit('timing-change', {
        id: props.subtitle.id,
        start: finalStart,
        end: finalEnd,
      });
    }
  }

  // Reset temp values and states
  tempStartTime.value = null;
  tempEndTime.value = null;
  hasCollision.value = false;
  snapState.value = { active: false, type: null, targetTime: null };
  
  // Clear snap guide
  emit('snap-state', { active: false, targetTime: null });

  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
};

// Resize handlers
const handleLeadingResize = (event: MouseEvent) => {
  event.preventDefault();
  event.stopPropagation();

  isResizing.value = true;
  resizeType.value = 'leading';
  resizeStartX.value = event.clientX;
  resizeStartTime.value = {
    start: props.subtitle.start,
    end: props.subtitle.end,
  };
  constraintWarningShown.value = false;

  document.addEventListener('mousemove', handleResizeMove);
  document.addEventListener('mouseup', handleResizeUp);
};

const handleTrailingResize = (event: MouseEvent) => {
  event.preventDefault();
  event.stopPropagation();

  isResizing.value = true;
  resizeType.value = 'trailing';
  resizeStartX.value = event.clientX;
  resizeStartTime.value = {
    start: props.subtitle.start,
    end: props.subtitle.end,
  };
  constraintWarningShown.value = false;

  document.addEventListener('mousemove', handleResizeMove);
  document.addEventListener('mouseup', handleResizeUp);
};

const handleResizeMove = (event: MouseEvent) => {
  if (!isResizing.value || !resizeType.value) return;

  const toast = useToast();
  const deltaX = event.clientX - resizeStartX.value;
  const deltaTime = pixelsToTime(Math.abs(deltaX), props.zoomLevel);
  const timeOffset = deltaX >= 0 ? deltaTime : -deltaTime;

  let newStart = resizeStartTime.value.start;
  let newEnd = resizeStartTime.value.end;
  
  // Reset snap state
  snapState.value = { active: false, type: null, targetTime: null };

  if (resizeType.value === 'leading') {
    // Adjust start time
    newStart = resizeStartTime.value.start + timeOffset;

    // Constraint: cannot go below 0
    if (newStart < 0) {
      newStart = 0;
      if (!constraintWarningShown.value) {
        toast.add({
          title: 'Cannot resize past start',
          description: 'Start time cannot be less than 0',
          color: 'orange',
          timeout: 2000,
        });
        constraintWarningShown.value = true;
      }
    }

    // Constraint: cannot go past previous subtitle
    if (adjacentSubtitles.value.prev && newStart < adjacentSubtitles.value.prev.end) {
      newStart = adjacentSubtitles.value.prev.end;
      if (!constraintWarningShown.value) {
        toast.add({
          title: 'Cannot resize',
          description: 'Adjacent subtitle blocking',
          color: 'orange',
          timeout: 2000,
        });
        constraintWarningShown.value = true;
      }
    }

    // Constraint: minimum duration
    if (newEnd - newStart < MIN_DURATION) {
      newStart = newEnd - MIN_DURATION;
      if (!constraintWarningShown.value) {
        toast.add({
          title: 'Minimum duration reached',
          description: `Subtitle must be at least ${MIN_DURATION}s`,
          color: 'orange',
          timeout: 2000,
        });
        constraintWarningShown.value = true;
      }
    }
    
    // Snap detection for leading handle
    if (adjacentSubtitles.value.prev) {
      const distanceToPrevEnd = Math.abs(newStart - adjacentSubtitles.value.prev.end);
      if (distanceToPrevEnd <= SNAP_THRESHOLD && newEnd - adjacentSubtitles.value.prev.end >= MIN_DURATION) {
        snapState.value = {
          active: true,
          type: 'start',
          targetTime: adjacentSubtitles.value.prev.end,
        };
      }
    }
  } else if (resizeType.value === 'trailing') {
    // Adjust end time
    newEnd = resizeStartTime.value.end + timeOffset;

    // Constraint: cannot exceed video duration
    if (newEnd > props.duration) {
      newEnd = props.duration;
      if (!constraintWarningShown.value) {
        toast.add({
          title: 'Cannot resize past end',
          description: 'End time cannot exceed video duration',
          color: 'orange',
          timeout: 2000,
        });
        constraintWarningShown.value = true;
      }
    }

    // Constraint: cannot go past next subtitle
    if (adjacentSubtitles.value.next && newEnd > adjacentSubtitles.value.next.start) {
      newEnd = adjacentSubtitles.value.next.start;
      if (!constraintWarningShown.value) {
        toast.add({
          title: 'Cannot resize',
          description: 'Adjacent subtitle blocking',
          color: 'orange',
          timeout: 2000,
        });
        constraintWarningShown.value = true;
      }
    }

    // Constraint: minimum duration
    if (newEnd - newStart < MIN_DURATION) {
      newEnd = newStart + MIN_DURATION;
      if (!constraintWarningShown.value) {
        toast.add({
          title: 'Minimum duration reached',
          description: `Subtitle must be at least ${MIN_DURATION}s`,
          color: 'orange',
          timeout: 2000,
        });
        constraintWarningShown.value = true;
      }
    }
    
    // Snap detection for trailing handle
    if (adjacentSubtitles.value.next) {
      const distanceToNextStart = Math.abs(newEnd - adjacentSubtitles.value.next.start);
      if (distanceToNextStart <= SNAP_THRESHOLD && adjacentSubtitles.value.next.start - newStart >= MIN_DURATION) {
        snapState.value = {
          active: true,
          type: 'end',
          targetTime: adjacentSubtitles.value.next.start,
        };
      }
    }
  }
  
  // Emit snap state for visual guide
  emit('snap-state', {
    active: snapState.value.active,
    targetTime: snapState.value.targetTime,
  });

  tempStartTime.value = newStart;
  tempEndTime.value = newEnd;

  // Emit timing change during resize
  emit('timing-change', {
    id: props.subtitle.id,
    start: newStart,
    end: newEnd,
  });
};

const handleResizeUp = () => {
  if (!isResizing.value) return;

  let finalStart = tempStartTime.value || props.subtitle.start;
  let finalEnd = tempEndTime.value || props.subtitle.end;

  // Apply snap if active
  if (snapState.value.active && snapState.value.targetTime !== null) {
    if (snapState.value.type === 'start') {
      // Snap start to previous subtitle end
      finalStart = snapState.value.targetTime;
    } else if (snapState.value.type === 'end') {
      // Snap end to next subtitle start
      finalEnd = snapState.value.targetTime;
    }
    
    // Emit the snapped timing change
    emit('timing-change', {
      id: props.subtitle.id,
      start: finalStart,
      end: finalEnd,
    });
  }

  isResizing.value = false;
  resizeType.value = null;
  constraintWarningShown.value = false;

  // Reset temp values and snap state
  tempStartTime.value = null;
  tempEndTime.value = null;
  snapState.value = { active: false, type: null, targetTime: null };
  
  // Clear snap guide
  emit('snap-state', { active: false, targetTime: null });

  document.removeEventListener('mousemove', handleResizeMove);
  document.removeEventListener('mouseup', handleResizeUp);
};

// Cleanup on unmount
onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
  document.removeEventListener('mousemove', handleResizeMove);
  document.removeEventListener('mouseup', handleResizeUp);
});
</script>

<template>
  <div
    :class="blockClasses"
    :style="blockStyle"
    @click="handleClick"
    @mousedown="handleMouseDown"
  >
    <!-- Leading resize handle -->
    <div
      :class="leadingHandleClasses"
      @mousedown="handleLeadingResize"
    />

    <span class="subtitle-timeline__block-text">
      {{ subtitle.text }}
    </span>

    <!-- Trailing resize handle -->
    <div
      :class="trailingHandleClasses"
      @mousedown="handleTrailingResize"
    />
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
  padding: 0 12px;
  overflow: visible;
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

.subtitle-timeline__block_resizing {
  opacity: 0.8;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
  z-index: 4;
}

.subtitle-timeline__block_snapping {
  border: 2px solid #3b82f6;
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.4);
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
  flex: 1;
  pointer-events: none;
}

/* Resize handles */
.subtitle-block__resize-handle {
  position: absolute;
  top: 0;
  width: 8px;
  height: 100%;
  cursor: ew-resize;
  background: transparent;
  transition: background 0.2s ease;
  z-index: 2;
}

.subtitle-block__resize-handle:hover {
  background: rgba(255, 255, 255, 0.3);
}

.subtitle-block__resize-handle_leading {
  left: 0;
  border-top-left-radius: 4px;
  border-bottom-left-radius: 4px;
}

.subtitle-block__resize-handle_trailing {
  right: 0;
  border-top-right-radius: 4px;
  border-bottom-right-radius: 4px;
}

.subtitle-block__resize-handle_active {
  background: #3b82f6;
  opacity: 0.9;
}

/* Prevent text selection during resize */
.subtitle-timeline__block_resizing .subtitle-timeline__block-text {
  user-select: none;
}
</style>
