<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useTimelineCalculations } from '~/composables/controls/useTimelineCalculations';
import { useTimeAgo } from '@vueuse/core';
import SubtitleBlock from './SubtitleBlock.vue';

// TypeScript interfaces
interface SubtitleObject {
  id: string | number;
  start: number;
  end: number;
  text:
    | string
    | {
        th?: string;
        en?: string;
        ru?: string;
      };
}

interface TimelineBaseProps {
  duration: number;
  subtitles: SubtitleObject[];
  currentTime?: number;
  saveStatus?: string;
  lastSavedAt?: Date | null;
  isSaving?: boolean;
}

interface TimeTick {
  time: number;
  position: number;
  label: string;
  isMajor: boolean;
}

// Props definition
const props = withDefaults(defineProps<TimelineBaseProps>(), {
  currentTime: 0,
  saveStatus: 'idle',
  lastSavedAt: null,
  isSaving: false,
});

// Emits definition
const emit = defineEmits<{
  'subtitle-select': [subtitle: SubtitleObject];
  'time-click': [time: number];
  'add-subtitle': [subtitle: SubtitleObject];
  'manual-save': [];
}>();

// Reactive state
const zoomLevel = ref<number>(1.0);
const scrollPosition = ref<number>(0);
const viewportWidth = ref<number>(1000); // Will be updated with actual viewport size
const selectedSubtitleId = ref<string | number | null>(null);
const lastClickedTime = ref<number>(0);
const lastUserInteractionTime = ref<number>(0);
const isAutoScrollEnabled = ref<boolean>(true);

// Template refs
const scrollContainer = ref<HTMLElement | null>(null);

// Timeline calculations composable
const { timeToPixels, pixelsToTime } = useTimelineCalculations();

// Time ago for save indicator
const timeAgo = computed(() => props.lastSavedAt ? useTimeAgo(props.lastSavedAt) : null);
const timeAgoText = computed(() => {
  if (!timeAgo.value) return '';
  const text = timeAgo.value.value;
  // Format: "Saved just now" or "Saved 30s ago"
  return text === 'just now' ? 'Saved just now' : `Saved ${text}`;
});

// SVG dimensions
const AXIS_HEIGHT = 70;

// Zoom constants
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10.0;
const ZOOM_MULTIPLIER = 1.5;

// Calculate tick intervals based on zoom level
const getTickIntervals = (zoom: number): { major: number; minor: number } => {
  if (zoom >= 2.0) {
    return { major: 5, minor: 0.5 };
  } else if (zoom <= 0.5) {
    return { major: 20, minor: 5 };
  } else {
    return { major: 10, minor: 1 };
  }
};

// Format time label (e.g., "0s", "10s", "1m 30s")
const formatTimeLabel = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs === 0 ? `${minutes}m` : `${minutes}m ${secs}s`;
};

// Compute visible time ticks
const visibleTicks = computed((): TimeTick[] => {
  const ticks: TimeTick[] = [];
  const { major, minor } = getTickIntervals(zoomLevel.value);

  // Calculate visible time range with some padding
  const startTime = Math.max(0, pixelsToTime(scrollPosition.value - 100, zoomLevel.value));
  const endTime = Math.min(
    props.duration,
    pixelsToTime(scrollPosition.value + viewportWidth.value + 100, zoomLevel.value)
  );

  // Generate major ticks
  const startMajor = Math.floor(startTime / major) * major;
  for (let time = startMajor; time <= endTime; time += major) {
    if (time >= 0 && time <= props.duration) {
      ticks.push({
        time,
        position: timeToPixels(time, zoomLevel.value),
        label: formatTimeLabel(time),
        isMajor: true,
      });
    }
  }

  // Generate minor ticks
  const startMinor = Math.floor(startTime / minor) * minor;
  for (let time = startMinor; time <= endTime; time += minor) {
    // Skip if this is a major tick
    if (time % major !== 0 && time >= 0 && time <= props.duration) {
      ticks.push({
        time,
        position: timeToPixels(time, zoomLevel.value),
        label: '',
        isMajor: false,
      });
    }
  }

  return ticks.sort((a, b) => a.time - b.time);
});

// Total timeline width
const timelineWidth = computed((): number => {
  return timeToPixels(props.duration, zoomLevel.value);
});

// Handle subtitle selection
const handleSubtitleSelection = (subtitle: SubtitleObject) => {
  emit('subtitle-select', subtitle);
};

// Zoom control functions
const handleZoomIn = () => {
  zoomLevel.value = Math.min(zoomLevel.value * ZOOM_MULTIPLIER, MAX_ZOOM);
};

const handleZoomOut = () => {
  zoomLevel.value = Math.max(zoomLevel.value / ZOOM_MULTIPLIER, MIN_ZOOM);
};

const handleFitToViewport = () => {
  if (viewportWidth.value > 0 && props.duration > 0) {
    const { getPixelsPerSecond } = useTimelineCalculations();
    const basePixelsPerSecond = getPixelsPerSecond(1.0);
    zoomLevel.value = viewportWidth.value / (props.duration * basePixelsPerSecond);

    // Reset scroll position
    if (scrollContainer.value) {
      scrollContainer.value.scrollLeft = 0;
    }
    scrollPosition.value = 0;
  }
};

// Handle subtitle block click
const handleSubtitleClick = (subtitle: SubtitleObject) => {
  selectedSubtitleId.value = subtitle.id;
  lastUserInteractionTime.value = Date.now();
  emit('subtitle-select', subtitle);
};

// Snap guide state
const snapGuidePosition = ref<number | null>(null);
const showSnapGuide = ref(false);

// Handle snap state changes from SubtitleBlock
const handleSnapState = (payload: { active: boolean; targetTime: number | null }) => {
  showSnapGuide.value = payload.active;
  if (payload.active && payload.targetTime !== null) {
    snapGuidePosition.value = timeToPixels(payload.targetTime, zoomLevel.value);
  } else {
    snapGuidePosition.value = null;
  }
};

// Handle subtitle timing change from drag/resize
const handleTimingChange = (payload: { id: string | number; start: number; end: number }) => {
  const subtitle = props.subtitles.find((s) => s.id === payload.id);
  if (!subtitle) return;

  const toast = useToast();
  let finalStart = payload.start;
  let finalEnd = payload.end;
  const duration = finalEnd - finalStart;

  // Check for overlaps with other subtitles
  const overlaps = props.subtitles.some((other) => {
    if (other.id === payload.id) return false;
    return finalStart < other.end && finalEnd > other.start;
  });

  if (overlaps) {
    // Find adjacent subtitle boundaries for auto-resolution
    const sorted = [...props.subtitles]
      .filter((s) => s.id !== payload.id)
      .sort((a, b) => a.start - b.start);

    // Find previous subtitle
    const prev = sorted.filter((s) => s.end <= finalStart).pop();
    
    if (prev) {
      // Snap to end of previous subtitle
      finalStart = prev.end;
      finalEnd = finalStart + duration;

      // Check if this creates new overlap with next subtitle
      const stillOverlaps = sorted.some((other) => {
        return finalStart < other.end && finalEnd > other.start;
      });

      if (stillOverlaps) {
        toast.add({
          title: 'Cannot place here',
          description: 'Overlaps with adjacent subtitles',
          color: 'orange',
          timeout: 2000,
        });
        return; // Revert - don't apply change
      }

      toast.add({
        title: 'Overlap detected',
        description: 'Subtitle repositioned to adjacent boundary',
        color: 'orange',
        timeout: 2000,
      });
    } else {
      // No valid position found
      toast.add({
        title: 'Cannot place here',
        description: 'Overlaps with adjacent subtitles',
        color: 'orange',
        timeout: 2000,
      });
      return; // Revert - don't apply change
    }
  }

  // Constrain to video duration
  if (finalEnd > props.duration) {
    finalEnd = props.duration;
    finalStart = Math.max(0, finalEnd - duration);
  }
  if (finalStart < 0) {
    finalStart = 0;
    finalEnd = Math.min(duration, props.duration);
  }

  // Update the subtitle times
  subtitle.start = finalStart;
  subtitle.end = finalEnd;

  // Maintain chronological order
  props.subtitles.sort((a, b) => a.start - b.start);
};

// Handle add subtitle
const handleAddSubtitle = () => {
  // Determine insertion position
  let insertPosition = 0;

  // Priority 1: Use current video playback position if available
  if (props.currentTime > 0) {
    insertPosition = props.currentTime;
  }
  // Priority 2: Use last clicked timeline position
  else if (lastClickedTime.value > 0) {
    insertPosition = lastClickedTime.value;
  }
  // Priority 3: End of last subtitle + 0.5s gap, or 0 if no subtitles
  else if (props.subtitles.length > 0) {
    const sortedSubtitles = [...props.subtitles].sort((a, b) => b.end - a.end);
    insertPosition = sortedSubtitles[0].end + 0.5;
  }

  // Default duration: 5 seconds
  const DEFAULT_DURATION = 5.0;
  const MIN_GAP = 0.1;

  let startTime = insertPosition;
  let endTime = insertPosition + DEFAULT_DURATION;

  // Adjust if would exceed video duration
  if (endTime > props.duration) {
    endTime = props.duration;
    startTime = Math.max(0, endTime - DEFAULT_DURATION);
  }

  // Check for collisions and adjust timing
  const overlappingSubtitles = props.subtitles.filter(
    (s) => startTime < s.end && endTime > s.start
  );

  if (overlappingSubtitles.length > 0) {
    // Find a gap to insert
    const sortedSubs = [...props.subtitles].sort((a, b) => a.start - b.start);

    // Try to find gap after clicked position
    let gapFound = false;
    for (let i = 0; i < sortedSubs.length - 1; i++) {
      const currentEnd = sortedSubs[i].end;
      const nextStart = sortedSubs[i + 1].start;
      const gapSize = nextStart - currentEnd;

      if (currentEnd >= insertPosition && gapSize >= DEFAULT_DURATION + MIN_GAP * 2) {
        startTime = currentEnd + MIN_GAP;
        endTime = startTime + DEFAULT_DURATION;
        gapFound = true;
        break;
      }
    }

    // If no gap found after, try before clicked position
    if (!gapFound) {
      for (let i = sortedSubs.length - 1; i > 0; i--) {
        const currentEnd = sortedSubs[i - 1].end;
        const nextStart = sortedSubs[i].start;
        const gapSize = nextStart - currentEnd;

        if (nextStart <= insertPosition && gapSize >= DEFAULT_DURATION + MIN_GAP * 2) {
          startTime = currentEnd + MIN_GAP;
          endTime = startTime + DEFAULT_DURATION;
          gapFound = true;
          break;
        }
      }
    }

    // If still no gap, place at end
    if (!gapFound && sortedSubs.length > 0) {
      startTime = sortedSubs[sortedSubs.length - 1].end + MIN_GAP;
      endTime = Math.min(startTime + DEFAULT_DURATION, props.duration);
    }
  }

  // Generate unique ID
  const newId = `subtitle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Create new subtitle object
  const newSubtitle: SubtitleObject = {
    id: newId,
    start: startTime,
    end: endTime,
    text: {
      th: '',
      en: '',
      ru: '',
    },
  };

  // Emit event for parent to handle insertion
  emit('add-subtitle', newSubtitle);

  // Auto-select the new subtitle
  selectedSubtitleId.value = newId;
};

// Handle timeline click
const handleTimelineClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  // Don't handle clicks on scroll container itself, only on SVG
  if (target.classList.contains('subtitle-timeline__scroll-container')) {
    return;
  }

  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const clickX = event.clientX - rect.left + scrollPosition.value;
  const time = pixelsToTime(clickX, zoomLevel.value);
  const clampedTime = Math.max(0, Math.min(time, props.duration));

  lastClickedTime.value = clampedTime;
  lastUserInteractionTime.value = Date.now();
  emit('time-click', clampedTime);
};

// Handle scroll event
const handleScroll = (event: Event) => {
  const target = event.target as HTMLElement;
  scrollPosition.value = target.scrollLeft;
  
  // Mark user interaction when manually scrolling
  lastUserInteractionTime.value = Date.now();
};

// Update viewport width on resize
const updateViewportWidth = () => {
  if (scrollContainer.value) {
    viewportWidth.value = scrollContainer.value.clientWidth;
  }
};

// Auto-scroll to keep current time visible during playback
const autoScrollToCurrentTime = () => {
  if (!scrollContainer.value || !isAutoScrollEnabled.value) return;
  
  // Don't auto-scroll if user interacted recently (within 3 seconds)
  const timeSinceInteraction = Date.now() - lastUserInteractionTime.value;
  if (timeSinceInteraction < 3000) return;
  
  // Calculate playhead position
  const playheadX = timeToPixels(props.currentTime, zoomLevel.value);
  const scrollLeft = scrollContainer.value.scrollLeft;
  const viewportWidth = scrollContainer.value.clientWidth;
  
  // Scroll if playhead is outside visible area or near edges
  const MARGIN = viewportWidth * 0.2; // Keep 20% margin
  const playheadInViewport = playheadX - scrollLeft;
  
  if (playheadInViewport < MARGIN || playheadInViewport > viewportWidth - MARGIN) {
    // Center the playhead in viewport
    const targetScroll = playheadX - viewportWidth / 2;
    scrollContainer.value.scrollLeft = Math.max(0, targetScroll);
  }
};

// Watch currentTime changes and auto-scroll
watch(() => props.currentTime, () => {
  autoScrollToCurrentTime();
});

// Lifecycle hooks
onMounted(() => {
  updateViewportWidth();
  window.addEventListener('resize', updateViewportWidth);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateViewportWidth);
});
</script>

<template>
  <div class="subtitle-timeline">
    <!-- Zoom Controls -->
    <div class="subtitle-timeline__controls">
      <UIButton variant="primary" size="sm" @click="handleAddSubtitle">
        <Icon name="lucide:plus" />
        <span class="subtitle-timeline__button-text">New Subtitle</span>
      </UIButton>

      <div class="subtitle-timeline__controls-divider" />

      <UIButton variant="secondary" size="sm" title="Zoom In" @click="handleZoomIn">
        <Icon name="lucide:zoom-in" />
      </UIButton>
      <UIButton variant="secondary" size="sm" title="Zoom Out" @click="handleZoomOut">
        <Icon name="lucide:zoom-out" />
      </UIButton>
      <UIButton variant="secondary" size="sm" title="Fit to Viewport" @click="handleFitToViewport">
        <Icon name="lucide:minimize-2" />
      </UIButton>
      <span class="subtitle-timeline__zoom-level">{{ Math.round(zoomLevel * 100) }}%</span>

      <div class="subtitle-timeline__controls-divider" />

      <!-- Save Indicator -->
      <div class="subtitle-timeline__save-indicator">
        <!-- Saving state -->
        <div v-if="saveStatus === 'saving'" class="subtitle-timeline__save-status subtitle-timeline__save-status_saving">
          <Icon name="lucide:loader-2" class="subtitle-timeline__save-icon subtitle-timeline__save-icon_spin" />
          <span class="subtitle-timeline__save-text">Saving...</span>
        </div>

        <!-- Saved state -->
        <div v-else-if="saveStatus === 'saved'" class="subtitle-timeline__save-status subtitle-timeline__save-status_saved">
          <Icon name="lucide:check-circle" class="subtitle-timeline__save-icon" />
          <span class="subtitle-timeline__save-text">{{ timeAgoText }}</span>
        </div>

        <!-- Error state -->
        <div v-else-if="saveStatus === 'error'" class="subtitle-timeline__save-status subtitle-timeline__save-status_error">
          <Icon name="lucide:alert-circle" class="subtitle-timeline__save-icon" />
          <span class="subtitle-timeline__save-text">Save failed</span>
        </div>

        <!-- Unsaved state -->
        <div v-else-if="saveStatus === 'unsaved'" class="subtitle-timeline__save-status subtitle-timeline__save-status_unsaved">
          <Icon name="lucide:circle" class="subtitle-timeline__save-icon" />
          <span class="subtitle-timeline__save-text">Unsaved changes</span>
        </div>

        <!-- Manual save button (optional) -->
        <UIButton
          v-if="saveStatus === 'unsaved' || saveStatus === 'error'"
          variant="secondary"
          size="sm"
          title="Save Now (Ctrl+S)"
          :disabled="isSaving"
          @click="emit('manual-save')"
        >
          <Icon name="lucide:save" />
        </UIButton>
      </div>
    </div>

    <!-- Scrollable Timeline Container -->
    <div ref="scrollContainer" class="subtitle-timeline__scroll-container" @scroll="handleScroll">
      <div class="subtitle-timeline__container" @click="handleTimelineClick">
        <!-- SVG Time Axis -->
        <svg class="subtitle-timeline__axis" :width="timelineWidth" :height="AXIS_HEIGHT">
          <!-- Time ticks -->
          <g v-for="tick in visibleTicks" :key="tick.time">
            <!-- Tick line -->
            <line
              :class="[
                'subtitle-timeline__tick',
                tick.isMajor ? 'subtitle-timeline__tick_major' : 'subtitle-timeline__tick_minor',
              ]"
              :x1="tick.position"
              :y1="AXIS_HEIGHT - (tick.isMajor ? 20 : 10)"
              :x2="tick.position"
              :y2="AXIS_HEIGHT"
            />

            <!-- Time label (only for major ticks) -->
            <text
              v-if="tick.isMajor"
              class="subtitle-timeline__label"
              :x="tick.position"
              :y="AXIS_HEIGHT - 25"
              text-anchor="middle"
            >
              {{ tick.label }}
            </text>
          </g>

          <!-- Current time indicator (playhead) -->
          <g v-if="currentTime >= 0 && currentTime <= duration" class="subtitle-timeline__playhead">
            <!-- Vertical line -->
            <line
              class="subtitle-timeline__playhead-line"
              :x1="timeToPixels(currentTime, zoomLevel)"
              :y1="0"
              :x2="timeToPixels(currentTime, zoomLevel)"
              :y2="AXIS_HEIGHT"
            />
            <!-- Top marker (triangle) -->
            <path
              class="subtitle-timeline__playhead-marker"
              :d="`M ${timeToPixels(currentTime, zoomLevel) - 6} 0 L ${timeToPixels(currentTime, zoomLevel) + 6} 0 L ${timeToPixels(currentTime, zoomLevel)} 10 Z`"
            />
            <!-- Time label -->
            <text
              class="subtitle-timeline__playhead-label"
              :x="timeToPixels(currentTime, zoomLevel)"
              :y="22"
              text-anchor="middle"
            >
              {{ formatTimeLabel(Math.floor(currentTime)) }}
            </text>
          </g>
        </svg>

        <!-- Snap Guide -->
        <div
          v-if="showSnapGuide && snapGuidePosition !== null"
          class="timeline__snap-guide"
          :style="{ left: `${snapGuidePosition}px` }"
        />

        <!-- Subtitle Blocks -->
        <SubtitleBlock
          v-for="subtitle in subtitles"
          :key="subtitle.id"
          :subtitle="subtitle"
          :zoom-level="zoomLevel"
          :is-selected="selectedSubtitleId === subtitle.id"
          :duration="duration"
          :other-subtitles="subtitles"
          :allow-collisions="false"
          @click="handleSubtitleClick"
          @timing-change="handleTimingChange"
          @snap-state="handleSnapState"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.subtitle-timeline {
  width: 100%;
  background-color: var(--color-background, #1a1a1a);
  border-radius: 8px;
  overflow: hidden;
}

.subtitle-timeline__container {
  position: relative;
  width: 100%;
  min-height: 200px;
  cursor: pointer;
}

.subtitle-timeline__axis {
  display: block;
  background-color: var(--color-surface, #242424);
  border-bottom: 1px solid var(--color-border, #333);
}

.subtitle-timeline__tick {
  stroke-width: 1;
}

.subtitle-timeline__tick_major {
  stroke: var(--color-text-primary, #e0e0e0);
  opacity: 0.8;
}

.subtitle-timeline__tick_minor {
  stroke: var(--color-text-secondary, #888);
  opacity: 0.4;
}

.subtitle-timeline__label {
  fill: var(--color-text-primary, #e0e0e0);
  font-size: 12px;
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
  user-select: none;
}

/* Playhead (current time indicator) */
.subtitle-timeline__playhead {
  pointer-events: none;
}

.subtitle-timeline__playhead-line {
  stroke: #ef4444;
  stroke-width: 3;
  opacity: 0.9;
}

.subtitle-timeline__playhead-marker {
  fill: #ef4444;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.subtitle-timeline__playhead-label {
  fill: #ef4444;
  font-size: 11px;
  font-weight: 600;
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
}

.subtitle-timeline__controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background-color: var(--color-surface, #242424);
  border-bottom: 1px solid var(--color-border, #333);
}

.subtitle-timeline__button-text {
  margin-left: 0.375rem;
}

.subtitle-timeline__controls-divider {
  width: 1px;
  height: 24px;
  background-color: var(--color-border, #444);
  margin: 0 0.25rem;
}

.subtitle-timeline__zoom-level {
  font-size: 0.875rem;
  color: var(--color-text-secondary, #888);
  font-weight: 600;
  user-select: none;
}

.subtitle-timeline__scroll-container {
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-behavior: smooth;
}

/* Custom scrollbar styling */
.subtitle-timeline__scroll-container::-webkit-scrollbar {
  height: 12px;
}

.subtitle-timeline__scroll-container::-webkit-scrollbar-track {
  background: var(--color-surface, #242424);
  border-radius: 0 0 8px 8px;
}

.subtitle-timeline__scroll-container::-webkit-scrollbar-thumb {
  background: var(--color-border, #444);
  border-radius: 6px;
  transition: background 0.2s ease;
}

.subtitle-timeline__scroll-container::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-secondary, #666);
}

.subtitle-timeline__scroll-container::-webkit-scrollbar-thumb:active {
  background: var(--color-text-primary, #888);
}

/* Save Indicator */
.subtitle-timeline__save-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: auto;
}

.subtitle-timeline__save-status {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.subtitle-timeline__save-icon {
  width: 14px;
  height: 14px;
}

.subtitle-timeline__save-icon_spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.subtitle-timeline__save-text {
  white-space: nowrap;
}

/* Save Status Colors */
.subtitle-timeline__save-status_saving {
  color: #3b82f6;
  background-color: rgba(59, 130, 246, 0.1);
}

.subtitle-timeline__save-status_saved {
  color: #10b981;
  background-color: rgba(16, 185, 129, 0.1);
}

.subtitle-timeline__save-status_error {
  color: #ef4444;
  background-color: rgba(239, 68, 68, 0.1);
}

.subtitle-timeline__save-status_unsaved {
  color: #6b7280;
  background-color: rgba(107, 114, 128, 0.1);
}

/* Snap Guide */
.timeline__snap-guide {
  position: absolute;
  top: 0;
  width: 2px;
  height: 100%;
  background: #3b82f6;
  opacity: 0.6;
  z-index: 5;
  pointer-events: none;
  box-shadow: 0 0 4px rgba(59, 130, 246, 0.5);
}
</style>
