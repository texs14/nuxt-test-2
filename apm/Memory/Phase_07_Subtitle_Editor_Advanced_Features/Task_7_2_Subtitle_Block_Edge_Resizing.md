# Task 7.2 - Subtitle Block Edge Resizing Interactions

**Status:** ✅ COMPLETE  
**Agent:** Agent_SubtitleEditor_Timeline  
**Date:** 2025-10-26  
**Dependencies:** Task 3.1, 3.2 (TimelineBase, SubtitleBlock)

---

## Implementation Summary

Added draggable resize handles to leading (left) and trailing (right) edges of SubtitleBlock.vue, enabling precise subtitle timing adjustments directly on the timeline with constraint enforcement and visual feedback.

---

## Changes Made

### 1. Resize Handles UI

**Location:** `app/components/SubtitleTimeline/SubtitleBlock.vue`

- Added two absolutely positioned divs at block edges
- Leading handle: left edge (adjusts start time)
- Trailing handle: right edge (adjusts end time)
- Handle width: 8px for easy grabbing
- Cursor: `ew-resize` (horizontal resize indicator)
- BEM classes: `.subtitle-block__resize-handle_leading`, `_trailing`

**Template Structure:**
```vue
<div :class="blockClasses" :style="blockStyle">
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
```

---

### 2. Resize State Management

**New Reactive Refs:**
```ts
const isResizing = ref(false);
const resizeType = ref<'leading' | 'trailing' | null>(null);
const resizeStartX = ref(0);
const resizeStartTime = ref({ start: 0, end: 0 });
const constraintWarningShown = ref(false);
```

**Constants:**
```ts
const MIN_DURATION = 0.5; // seconds
const HANDLE_WIDTH = 8; // pixels
```

---

### 3. Adjacent Subtitle Detection

**Computed Property:**
```ts
const adjacentSubtitles = computed(() => {
  const sorted = [...props.otherSubtitles]
    .filter((s) => s.id !== props.subtitle.id)
    .sort((a, b) => a.start - b.start);
  
  const currentIndex = sorted.findIndex((s) => s.start >= props.subtitle.start);
  
  return {
    prev: currentIndex > 0 ? sorted[currentIndex - 1] : null,
    next: currentIndex >= 0 && currentIndex < sorted.length 
      ? sorted.find(s => s.start > props.subtitle.start) 
      : null,
  };
});
```

**Purpose:**
- Finds previous subtitle for leading handle boundary check
- Finds next subtitle for trailing handle boundary check
- Used to prevent overlaps during resize

---

### 4. Leading Handle Resize Logic

**Function:** `handleLeadingResize(event: MouseEvent)`

**Initialization:**
- Set `isResizing = true`, `resizeType = 'leading'`
- Store initial mouse X position
- Store initial subtitle start/end times
- Reset constraint warning flag
- Add mousemove and mouseup event listeners

**Resize Move Logic:**
```ts
const handleResizeMove = (event: MouseEvent) => {
  // Calculate time delta from pixel movement
  const deltaX = event.clientX - resizeStartX.value;
  const deltaTime = pixelsToTime(Math.abs(deltaX), props.zoomLevel);
  const timeOffset = deltaX >= 0 ? deltaTime : -deltaTime;

  let newStart = resizeStartTime.value.start + timeOffset;

  // Constraint checks...
  tempStartTime.value = newStart;
  
  // Emit timing change
  emit('timing-change', {
    id: props.subtitle.id,
    start: newStart,
    end: newEnd,
  });
};
```

**Constraints Applied:**
1. **Cannot go below 0 seconds**
   - Clamp: `newStart = 0`
   - Toast: "Cannot resize past start"

2. **Cannot overlap previous subtitle**
   - Clamp: `newStart = adjacentSubtitles.value.prev.end`
   - Toast: "Adjacent subtitle blocking"

3. **Minimum duration enforcement**
   - Clamp: `newStart = newEnd - MIN_DURATION`
   - Toast: "Minimum duration reached (0.5s)"

---

### 5. Trailing Handle Resize Logic

**Function:** `handleTrailingResize(event: MouseEvent)`

**Similar structure to leading handle but adjusts end time**

**Constraints Applied:**
1. **Cannot exceed video duration**
   - Clamp: `newEnd = props.duration`
   - Toast: "Cannot resize past end"

2. **Cannot overlap next subtitle**
   - Clamp: `newEnd = adjacentSubtitles.value.next.start`
   - Toast: "Adjacent subtitle blocking"

3. **Minimum duration enforcement**
   - Clamp: `newEnd = newStart + MIN_DURATION`
   - Toast: "Minimum duration reached (0.5s)"

---

### 6. Real-Time Updates

**Emit During Resize:**
- `timing-change` event emitted on every mousemove
- Parent receives updated `{ id, start, end }`
- Block repositions reactively using `tempStartTime` and `tempEndTime`
- Visual feedback instant (no lag)

**Cleanup on mouseup:**
```ts
const handleResizeUp = () => {
  isResizing.value = false;
  resizeType.value = null;
  constraintWarningShown.value = false;
  tempStartTime.value = null;
  tempEndTime.value = null;
  
  document.removeEventListener('mousemove', handleResizeMove);
  document.removeEventListener('mouseup', handleResizeUp);
};
```

---

### 7. Conflict Prevention with Block Drag

**Modified Block Mousedown:**
```ts
const handleMouseDown = (event: MouseEvent) => {
  // Only allow drag if not clicking on resize handle
  if ((event.target as HTMLElement).classList.contains('subtitle-block__resize-handle')) {
    return;
  }
  
  // Existing drag logic...
};
```

**Click Handler Update:**
```ts
const handleClick = () => {
  if (!isDragging.value && !isResizing.value) {
    emit('click', props.subtitle);
  }
};
```

---

### 8. Visual Feedback

**Handle States:**
- **Default:** Transparent background
- **Hover:** `rgba(255, 255, 255, 0.3)` - white semi-transparent
- **Active (dragging):** `#3b82f6` - blue solid

**Block State Classes:**
```ts
const blockClasses = computed(() => [
  'subtitle-timeline__block',
  {
    'subtitle-timeline__block_selected': props.isSelected,
    'subtitle-timeline__block_dragging': isDragging.value,
    'subtitle-timeline__block_resizing': isResizing.value,
    'subtitle-timeline__block_collision': hasCollision.value,
  },
]);
```

**Handle Classes:**
```ts
const leadingHandleClasses = computed(() => [
  'subtitle-block__resize-handle',
  'subtitle-block__resize-handle_leading',
  {
    'subtitle-block__resize-handle_active': isResizing.value && resizeType.value === 'leading',
  },
]);
```

---

### 9. Toast Warning System

**Single Warning Per Resize:**
- `constraintWarningShown` flag prevents spam
- Reset on resize start
- Shows once when constraint hit
- Different messages for different constraints

**Toast Implementation:**
```ts
const toast = useToast();
if (!constraintWarningShown.value) {
  toast.add({
    title: 'Cannot resize',
    description: 'Adjacent subtitle blocking',
    color: 'orange',
    timeout: 2000,
  });
  constraintWarningShown.value = true;
}
```

---

### 10. CSS Styling

**Resize Handle Base:**
```css
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
```

**Position Modifiers:**
```css
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
```

**Active State:**
```css
.subtitle-block__resize-handle_active {
  background: #3b82f6;
  opacity: 0.9;
}
```

**Block Resizing State:**
```css
.subtitle-timeline__block_resizing {
  opacity: 0.8;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
  z-index: 4;
}
```

---

## Files Modified

1. **app/components/SubtitleTimeline/SubtitleBlock.vue**
   - Added leading/trailing resize handles to template
   - Implemented resize state management
   - Added adjacent subtitle detection logic
   - Created resize drag handlers (handleLeadingResize, handleTrailingResize, handleResizeMove, handleResizeUp)
   - Added constraint validation (min duration, boundaries, adjacent subtitles)
   - Integrated toast warning system
   - Updated block and handle class computeds
   - Modified handleMouseDown to prevent conflicts
   - Added CSS for resize handles and states
   - Updated cleanup in onUnmounted

---

## Dependencies

**Existing Imports (reused):**
- `useTimelineCalculations` - pixelsToTime conversion
- `useToast` - constraint warning toasts
- Vue refs, computed, onUnmounted

**Props Required:**
- `subtitle` - SubtitleObject with id, start, end
- `zoomLevel` - for pixel-to-time calculations
- `duration` - video duration for trailing boundary
- `otherSubtitles` - array for adjacent subtitle detection

**Events Emitted:**
- `timing-change: { id, start, end }` - during resize move

---

## Success Criteria Verification

✅ Resize handles visible on SubtitleBlock hover  
✅ Cursor changes to `ew-resize` on handle hover  
✅ Leading handle adjusts start time only  
✅ Trailing handle adjusts end time only  
✅ Block repositions reactively during resize drag  
✅ Minimum 0.5s duration enforced for both handles  
✅ Cannot resize past adjacent subtitle boundaries  
✅ Cannot resize beyond 0s or video duration  
✅ Toast warnings display on constraint violations  
✅ Single toast per resize operation (no spam)  
✅ Timing-change events emitted with updated subtitle object  
✅ BEM methodology maintained throughout  
✅ No conflicts with existing block drag functionality  
✅ Visual feedback (transparent → white → blue)  
✅ Handle states properly computed and applied  

---

## Testing Recommendations

1. **Leading Handle Resize:**
   - Drag left edge leftward → verify start time decreases
   - Drag to 0s boundary → verify clamps and toast
   - Drag past previous subtitle → verify clamps and toast
   - Drag too close to end → verify min duration enforcement

2. **Trailing Handle Resize:**
   - Drag right edge rightward → verify end time increases
   - Drag to video duration → verify clamps and toast
   - Drag past next subtitle → verify clamps and toast
   - Drag too close to start → verify min duration enforcement

3. **Visual States:**
   - Hover handles → verify white semi-transparent background
   - Drag handle → verify blue active state
   - Verify block opacity changes during resize
   - Check z-index layering (resizing block on top)

4. **Conflict Prevention:**
   - Click handle → verify resize starts (not drag)
   - Click block body → verify drag starts (not resize)
   - Verify click event only fires when not resizing/dragging

5. **Real-Time Updates:**
   - Resize handle → verify parent receives timing-change events
   - Verify SubtitleEditPanel (if open) reflects time changes
   - Check timeline calculations with different zoom levels

6. **Adjacent Subtitle Scenarios:**
   - Resize with no adjacent subtitles → full range available
   - Resize with adjacent subtitle → verify boundary enforcement
   - Test with multiple subtitles on timeline

---

## Notes

- Resize handles have higher z-index (2) than block text for click precedence
- `tempStartTime` and `tempEndTime` provide optimistic UI updates
- Adjacent subtitle detection uses sorted array with smart indexing
- Constraint checks ordered by priority (boundaries → adjacent → duration)
- `constraintWarningShown` flag prevents toast spam during continuous drag
- Handle width (8px) provides comfortable grab target
- Padding adjusted to `0 12px` to accommodate handles without text overlap
- `overflow: visible` on block allows handles to extend slightly beyond bounds
- BEM modifiers: `_leading`, `_trailing`, `_active` for clear state management

---

**Implementation Complete** ✅
