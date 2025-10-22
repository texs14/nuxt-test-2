---
task_id: "Task_3_1"
task_name: "Timeline Base Component with Time Axis"
phase: "Phase_03_Subtitle_Editor_Rebuild"
agent: "Agent_SubtitleEditor_Timeline"
status: "completed"
completion_date: "2025-10-22"
execution_exchanges: 5
dependencies: []
blocks: []
---

# Task 3.1: Timeline Base Component with Time Axis

## Status: ✅ COMPLETED

**Completion Date:** October 22, 2025  
**Execution Exchanges:** 5 (as planned)  
**Agent:** Agent_SubtitleEditor_Timeline

---

## Summary

Successfully implemented Filmora-style timeline base component with horizontal time axis, zoom controls, and horizontal scrolling. Foundation established for visual subtitle editing with drag-and-drop blocks in subsequent tasks.

---

## Implementation Details

### Step 1: TimelineBase Component Structure ✅

**File Created:** `app/components/SubtitleTimeline/TimelineBase.vue`

**Components Implemented:**
- TypeScript interface `SubtitleObject` with fields: `id`, `start`, `end`, `text`
- Props interface `TimelineBaseProps` with: `duration`, `subtitles`, `currentTime` (default: 0)
- Emits: `subtitle-select` (passes SubtitleObject), `time-click` (passes time in seconds)
- Reactive state: `zoomLevel` (1.0), `scrollPosition` (0), `viewportWidth` (1000)
- Template ref: `scrollContainer` for DOM access
- BEM base class: `.subtitle-timeline`

### Step 2: Timeline Calculations Composable ✅

**File Created:** `app/composables/controls/useTimelineCalculations.ts`

**Functions Implemented:**
- `timeToPixels(time: number, zoom: number)`: Converts seconds → pixels
  - Formula: `time * PIXELS_PER_SECOND * zoom`
  - Base constant: `PIXELS_PER_SECOND = 10` (10px/second at zoom 1.0)
- `pixelsToTime(pixels: number, zoom: number)`: Converts pixels → seconds
  - Inverse formula: `pixels / (PIXELS_PER_SECOND * zoom)`
- `getVisibleTimeRange(scrollX, viewportWidth, zoom)`: Returns `{startTime, endTime}` for viewport
- `getPixelsPerSecond(zoom)`: Helper returning current scale factor

**TypeScript:** Full type coverage for all parameters and return values

### Step 3: SVG Time Axis Rendering ✅

**Features Implemented:**
- SVG element: 70px height, full timeline width
- Dynamic tick intervals based on zoom level:
  - **Zoom ≥2.0:** Major ticks every 5s, minor every 0.5s
  - **Zoom 1.0:** Major ticks every 10s, minor every 1s
  - **Zoom ≤0.5:** Major ticks every 20s, minor every 5s
- Tick rendering:
  - Major ticks: 20px height, 80% opacity, thicker stroke
  - Minor ticks: 10px height, 40% opacity, thinner stroke
- Time labels: Formatted as "0s", "10s", "1m 30s" positioned above major ticks
- Current time indicator: Green vertical line (2px width) following `currentTime` prop
- Virtual scrolling: `visibleTicks` computed property only renders ticks within viewport (+100px padding)
- BEM classes: `.subtitle-timeline__axis`, `__tick`, `__tick_major`, `__tick_minor`, `__label`

**Styling:**
- Dark theme with CSS variables (`--color-background`, `--color-surface`, etc.)
- Fallback colors for standalone usage
- SVG text styling: 12px font, user-select: none

### Step 4: Zoom Controls ✅

**Constants Defined:**
- `MIN_ZOOM = 0.1` (minimum zoom level)
- `MAX_ZOOM = 10.0` (maximum zoom level)
- `ZOOM_MULTIPLIER = 1.5` (zoom increment/decrement factor)

**Functions Implemented:**
- `handleZoomIn()`: Multiplies zoom by 1.5, clamped to MAX_ZOOM
- `handleZoomOut()`: Divides zoom by 1.5, clamped to MIN_ZOOM
- `handleFitToViewport()`: 
  - Calculates zoom to fit entire duration in viewport width
  - Formula: `zoom = viewportWidth / (duration * basePixelsPerSecond)`
  - Resets scroll position to 0

**UI Components:**
- Three UIButton components (variant="secondary", size="sm")
- Lucide icons: `lucide:zoom-in`, `lucide:zoom-out`, `lucide:minimize-2`
- Zoom level display: Shows percentage (e.g., "100%")
- BEM class: `.subtitle-timeline__controls` with flexbox layout
- Controls positioned above timeline with border separator

**Reactive Behavior:**
- Time axis automatically recomputes ticks when zoom changes
- Smooth CSS transitions on zoom level changes

### Step 5: Horizontal Scrolling ✅

**Scrolling Implementation:**
- Scroll container wrapper: `overflow-x: auto`, `overflow-y: hidden`
- Smooth scrolling: `scroll-behavior: smooth` CSS property
- Total timeline width: Computed as `duration * pixelsPerSecond * zoom`
- Scroll handler: `handleScroll()` updates `scrollPosition` reactive state
- Template ref: `scrollContainer` for programmatic scroll control

**Viewport Tracking:**
- `updateViewportWidth()`: Measures actual container width
- Lifecycle hooks:
  - `onMounted`: Initializes viewport width, adds resize listener
  - `onUnmounted`: Removes resize listener
- Viewport state drives visible tick calculation

**Custom Scrollbar Styling:**
- Height: 12px with rounded corners
- Track: Dark surface color, rounded bottom corners
- Thumb: Border color with hover/active states
- Webkit scrollbar customization for Chromium browsers
- Transition effects for smooth hover feedback

**Performance Optimization:**
- Virtual scrolling: Only renders ticks within viewport (with padding)
- Visible range calculation considers scroll position and viewport width
- Efficient recomputation using Vue computed properties

**Click Handling:**
- Timeline click converts pixel position to time
- Accounts for scroll offset in calculation
- Emits `time-click` event with clamped time value (0 to duration)
- Guards against clicks on scroll container itself

---

## Files Created/Modified

### Created Files
1. **`app/components/SubtitleTimeline/TimelineBase.vue`** (305 lines)
   - Complete timeline component with all features
   - TypeScript script setup with full type coverage
   - SVG rendering with BEM styling
   - Zoom controls and scroll handling

2. **`app/composables/controls/useTimelineCalculations.ts`** (80 lines)
   - Bidirectional time↔pixel conversion utilities
   - TypeScript interfaces for all types
   - Comprehensive JSDoc comments

### Modified Files
- None (new feature implementation)

---

## Technical Specifications

### Component API

**Props:**
```typescript
{
  duration: number;          // Total video duration in seconds
  subtitles: SubtitleObject[]; // Array of subtitle objects
  currentTime?: number;      // Current playback position (default: 0)
}
```

**Emits:**
```typescript
{
  'subtitle-select': [subtitle: SubtitleObject]; // When subtitle clicked
  'time-click': [time: number];                   // When timeline clicked
}
```

**SubtitleObject Interface:**
```typescript
{
  id: string | number;
  start: number;    // Start time in seconds
  end: number;      // End time in seconds
  text: string;     // Subtitle text content
}
```

### Zoom Behavior

- **Range:** 0.1x to 10.0x (10% to 1000%)
- **Multiplier:** 1.5x per zoom in/out action
- **Fit-to-viewport:** Auto-calculates zoom to show full duration
- **Reactive:** All tick intervals and positions update automatically

### Tick Intervals

| Zoom Level | Major Ticks | Minor Ticks |
|------------|-------------|-------------|
| ≥2.0       | Every 5s    | Every 0.5s  |
| 1.0        | Every 10s   | Every 1s    |
| ≤0.5       | Every 20s   | Every 5s    |

### Performance Characteristics

- **Virtual scrolling:** Only renders visible ticks (viewport + 100px padding)
- **Computed properties:** Efficient reactive recalculation
- **Smooth scrolling:** Native CSS scroll-behavior
- **Optimized rendering:** SVG for vector graphics, no Canvas overhead

---

## Success Criteria - ALL MET ✅

- ✅ Timeline renders with correct time markers based on duration prop
- ✅ Zoom in/out adjusts time axis granularity and spacing
- ✅ Fit-to-viewport calculates correct zoom to show full duration
- ✅ Horizontal scrolling works smoothly without performance issues
- ✅ Time axis labels are readable and positioned correctly
- ✅ Component follows BEM methodology
- ✅ TypeScript types for all props, emits, and composable functions
- ✅ SVG rendering (not Canvas) as specified
- ✅ UIButton component used for zoom controls
- ✅ Lucide icons integrated
- ✅ SOLID and DRY patterns followed
- ✅ Virtual scrolling optimization implemented

---

## Design Patterns Applied

### SOLID Principles
- **Single Responsibility:** TimelineBase handles timeline rendering, calculations separated to composable
- **Open/Closed:** Component extensible via props, closed for modification
- **Dependency Inversion:** Uses composable abstraction for calculations

### DRY (Don't Repeat Yourself)
- Calculation logic centralized in `useTimelineCalculations` composable
- Tick generation uses single loop with conditional logic
- Reusable helper functions (`formatTimeLabel`, `getTickIntervals`)

### Vue 3 Best Practices
- Composition API with script setup
- Reactive state management with ref/computed
- Proper lifecycle hooks (onMounted/onUnmounted)
- Template refs for DOM access
- Event handling with proper typing

---

## Testing Recommendations

### Manual Testing Performed
- ✅ Component structure and props interface
- ✅ Time↔pixel conversion accuracy
- ✅ SVG axis rendering with correct tick positions
- ✅ Zoom controls functionality (in/out/fit)
- ✅ Horizontal scrolling behavior
- ✅ Viewport width tracking on resize
- ✅ Current time indicator positioning

### Edge Cases Tested
- ✅ Short duration (30s)
- ✅ Long duration (600s / 10 minutes)
- ✅ Minimum zoom (0.1x)
- ✅ Maximum zoom (10.0x)
- ✅ Fit-to-viewport with various widths
- ✅ Scroll position tracking accuracy

### Recommended Future Testing
1. **Unit tests:** Test calculation composable functions
2. **Component tests:** Test zoom, scroll, and click behaviors
3. **Integration tests:** Test with actual video player component
4. **Performance tests:** Long videos (30+ minutes), many subtitles (100+)
5. **Accessibility tests:** Keyboard navigation, screen reader support

---

## Integration Notes

### Required Dependencies
- **Vue 3:** Core framework (already in project)
- **Lucide icons:** For zoom control buttons (already in project)
- **UIButton component:** `~/components/ui/UIButton.vue` (already exists)

### CSS Variables Required
Component expects these CSS variables (fallbacks provided):
- `--color-background` (fallback: #1a1a1a)
- `--color-surface` (fallback: #242424)
- `--color-border` (fallback: #333)
- `--color-text-primary` (fallback: #e0e0e0)
- `--color-text-secondary` (fallback: #888)
- `--color-accent` (fallback: #10b981)

### Usage Example
```vue
<template>
  <TimelineBase
    :duration="300"
    :subtitles="subtitleList"
    :current-time="currentPlaybackTime"
    @subtitle-select="handleSubtitleSelect"
    @time-click="handleTimelineClick"
  />
</template>

<script setup lang="ts">
import TimelineBase from '~/components/SubtitleTimeline/TimelineBase.vue';

const subtitleList = ref([
  { id: 1, start: 0, end: 5, text: 'Hello world' },
  { id: 2, start: 5, end: 10, text: 'Second subtitle' }
]);

const currentPlaybackTime = ref(0);

const handleSubtitleSelect = (subtitle) => {
  console.log('Selected:', subtitle);
};

const handleTimelineClick = (time) => {
  console.log('Clicked at:', time);
  currentPlaybackTime.value = time;
};
</script>
```

---

## Next Steps

### Immediate Next Tasks (Task 3.2)
1. **Implement subtitle blocks on timeline:**
   - Visual blocks positioned using time-to-pixel conversion
   - Color coding for different subtitle states
   - Hover effects and selection states

2. **Add drag-and-drop functionality:**
   - Drag to reposition subtitle blocks
   - Resize handles for adjusting start/end times
   - Snap-to-grid behavior (optional)

3. **Keyboard navigation:**
   - Arrow keys to navigate between subtitles
   - Shift+arrow for fine adjustments
   - Delete key to remove selected subtitle

### Future Enhancements
1. **Waveform visualization:** Audio waveform overlay on timeline
2. **Multi-track support:** Multiple subtitle tracks (different languages)
3. **Markers system:** Visual markers for important timestamps
4. **Playback controls integration:** Sync with video player component
5. **Undo/redo:** History management for timeline edits

---

## Agent Handoff Notes

**For Agent_SubtitleEditor_Blocks (Task 3.2):**
- Timeline base component is ready for subtitle block rendering
- Use `timeToPixels()` from composable to position blocks
- Emit `subtitle-select` when block is clicked
- Follow established BEM naming: `.subtitle-timeline__block`, `__block_selected`, etc.
- Subtitle block should be absolutely positioned inside `.subtitle-timeline__container`
- Consider z-index layering: axis (1), blocks (2), current time indicator (3), selected block (4)

**For Agent_SubtitleEditor_DragDrop (Task 3.3):**
- Component provides `time-click` event for timeline interaction
- `pixelsToTime()` available for converting drag positions to time values
- Consider adding `@subtitle-move` and `@subtitle-resize` emits in future
- Drag constraints should respect timeline boundaries (0 to duration)

---

**Memory Log Complete**
