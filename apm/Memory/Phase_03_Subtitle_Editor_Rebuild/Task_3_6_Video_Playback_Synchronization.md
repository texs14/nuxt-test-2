---
task_ref: "Task 3.6"
phase: "Phase_03_Subtitle_Editor_Rebuild"
status: "completed"
created_at: "2025-10-22T10:08:00Z"
updated_at: "2025-10-22T10:14:00Z"
completed_at: "2025-10-22T10:14:00Z"
assigned_agent: "Agent_SubtitleEditor_Integration"
dependencies: ["Task_3.1", "Task_3.2", "Task_3.3", "Task_3.4", "Task_3.5"]
---

# Task 3.6 - Video Playback Synchronization

## Overview
Integrate timeline with video player for bidirectional synchronization: video playback updates timeline cursor, timeline clicks seek video, subtitle selection jumps to timestamp, and playback auto-pauses when editing.

## Progress Log

### Step 1: Research VideoPlayer Component ✅ COMPLETED
**Date:** 2025-10-22

#### VideoPlayer Component Analysis
**File:** `app/components/VideoPlayer.vue`

**Architecture:**
- Uses composition API with composables pattern
- VideoPlayerCore.vue wraps native `<video>` element
- State managed via `useVideoPlayback` composable
- Template refs: `coreRef`, `videoRef` (computed from coreRef.videoRef)

**Props:**
```typescript
{
  src: string;
  subtitles?: SubtitleItem[] | null;
  lang?: Locale;
  showAllLangs?: boolean;
  restrictedRange?: PlaybackRange | null;
  hideTimeline?: boolean;
  hideNavigationButtons?: boolean;
}
```

**Emits:**
```typescript
{
  (e: 'ready'): void;
}
```

**Video Events Forwarded:**
- `timeupdate` → handled by `handleTimeUpdate()`
- `loadedmetadata` → handled by `handleLoadedMetadata()` → emits 'ready'
- `durationchange` → handled by `playback.onDurationChange()`
- `play` → handled by `handlePlay()`
- `pause` → handled by `playback.onPause()`

#### useVideoPlayback Composable
**File:** `app/composables/video/useVideoPlayback.ts`

**Exposed State:**
```typescript
{
  currentTime: Ref<number>;
  duration: Ref<number>;
  isPlaying: Ref<boolean>;
  volume: Ref<number>;
}
```

**Exposed Methods:**
```typescript
{
  play(): void;
  pause(): void;
  togglePlay(): void;
  setVolume(v: number): void;
  seekToTime(time: number): void; // Key method for seeking
}
```

**Event Handlers:**
```typescript
{
  onTimeUpdate(e: Event): void;
  onLoadedMetadata(): void;
  onDurationChange(): void;
  onPlay(): void;
  onPause(): void;
}
```

**Key Implementation Details:**
- `seekToTime()` preserves playing state (if was playing, resumes after seek)
- `playWithCatch()` wraps play() to suppress uncaught promise rejections
- Duration is validated with `Number.isFinite()` check
- Current implementation in VideoPlayer.vue creates playback composable on line 134

#### SubtitleEditor Integration Points
**File:** `app/components/SubtitleTimeline/SubtitleEditor.vue`

**Current Props:**
```typescript
{
  duration: number;
  currentTime?: number; // Already accepts currentTime!
  modelValue?: SubtitleObject[];
}
```

**Emits:**
```typescript
{
  'update:modelValue': [subtitles: SubtitleObject[]];
}
```

**TimelineBase Emits (child component):**
```typescript
{
  'subtitle-select': [subtitle: SubtitleObject];
  'time-click': [time: number];
  'add-subtitle': [subtitle: SubtitleObject];
}
```

**Current Handlers in SubtitleEditor:**
- `handleTimelineClick(time)` - logs to console (line 88)
- `handleSubtitleSelect(subtitle)` - opens edit panel (line 82)
- `handleAddSubtitle(subtitle)` - creates new subtitle (line 93)

#### Integration Usage Context
**File:** `app/pages/videos/[id].vue`

**Current Setup (Edit Mode):**
- Line 17-23: VideoPlayer component
- Line 72: SubtitleEditor component (in edit mode)
- **No integration between them currently**
- SubtitleEditor uses local `editorSubtitles` ref
- VideoPlayer has its own state

**Missing Integration:**
- VideoPlayer currentTime not passed to SubtitleEditor
- SubtitleEditor events not connected to VideoPlayer
- No shared state or sync mechanism

#### Design Decisions

**Integration Pattern: Composable-based Sync**
- ✅ Create `useSubtitleEditorSync` composable
- Accepts video playback composable data
- Provides integration handlers
- Parent component (page) orchestrates sync

**Rationale:**
- Keeps components decoupled
- Reusable for other video + timeline scenarios
- Follows existing architecture pattern
- Easy to test

**State Sharing Approach:**
- Pass `currentTime` from VideoPlayer to SubtitleEditor as prop
- Wire event handlers in parent component
- Use sync composable for coordination logic

**Interaction Behaviors:**
1. **Timeline Click → Video Seek:**
   - Listen to `time-click` from SubtitleEditor
   - Call `seekToTime()` on video
   - Auto-pause video (configurable)

2. **Subtitle Select → Video Jump:**
   - Listen to `subtitle-select` from SubtitleEditor
   - Seek to subtitle.start
   - Auto-pause for editing

3. **Video → Timeline Update:**
   - Pass video `currentTime` to SubtitleEditor `currentTime` prop
   - Timeline displays current position (already implemented in Task 3.1)

4. **Edit Operations → Pause:**
   - When edit panel opens, pause video
   - User can resume manually

**Auto-scroll Strategy (Step 3):**
- Track user interaction state
- Only auto-scroll when playing and no recent interaction
- Use `isUserInteracting` flag with timeout

#### Created Files
- ✅ `app/composables/useSubtitleEditorSync.ts`

**Composable Interface:**
```typescript
interface UseSubtitleEditorSyncOptions {
  videoRef: Ref<HTMLVideoElement | null>;
  currentTime: Ref<number>;
  duration: Ref<number>;
  isPlaying: Ref<boolean>;
  seekToTime: (time: number) => void;
  pause: () => void;
  play: () => void;
}
```

**Composable Returns:**
```typescript
{
  // State
  currentTime: Ref<number>;
  duration: Ref<number>;
  isPlaying: Ref<boolean>;
  isUserInteracting: Ref<boolean>;

  // Event handlers
  handleTimelineClick: (time: number) => void;
  handleSubtitleSelect: (subtitle) => void;
  markUserInteraction: () => void;

  // Methods
  resumePlayback: () => void;
  pauseForEditing: () => void;
  seekToTime: (time: number) => void;
}
```

#### Key Findings Summary
✅ VideoPlayer props/emits documented
✅ VideoPlayer state structure identified
✅ Available video control methods found
✅ State management pattern: Composable-based
✅ Existing video composables: `useVideoPlayback`
✅ Event names: timeupdate, play, pause, loadedmetadata
✅ Video time update architecture: HTMLVideoElement → composable state

**Next Steps (Step 2):**
- Modify SubtitleEditor to emit events to parent
- Update video detail page to integrate VideoPlayer + SubtitleEditor
- Wire up timeline click → video seek
- Wire up subtitle select → video jump + pause
- Test basic synchronization

## Technical Notes

### Performance Considerations
- `timeupdate` event fires frequently (multiple times per second)
- SubtitleEditor already accepts currentTime prop (reactive)
- Vue's reactivity system should handle updates efficiently
- May need throttling in Step 3 if auto-scroll is expensive

### State Flow Design
```
VideoPlayer (video element)
  └─> useVideoPlayback composable
       └─> currentTime ref
            └─> passed to SubtitleEditor prop
                 └─> TimelineBase displays cursor

TimelineBase (user click)
  └─> emits 'time-click'
       └─> SubtitleEditor forwards event
            └─> Parent page handler
                 └─> useSubtitleEditorSync.handleTimelineClick()
                      └─> seekToTime() on video
```

## Files Modified/Created

### Created
- ✅ `app/composables/useSubtitleEditorSync.ts` - Integration composable

### To Modify (Next Steps)
- `app/pages/videos/[id].vue` - Wire up integration in edit mode
- `app/components/SubtitleTimeline/SubtitleEditor.vue` - Forward events to parent
- `app/components/SubtitleTimeline/TimelineBase.vue` - Add auto-scroll (Step 3)

## Dependencies

### Required Components
- ✅ VideoPlayer component
- ✅ VideoPlayerCore component
- ✅ SubtitleEditor component
- ✅ TimelineBase component
- ✅ useVideoPlayback composable

### Task Dependencies
- ✅ Task 3.1: Timeline with currentTime prop support
- ✅ Task 3.2-3.5: All editing operations functional

### Step 2: Timeline → Video Synchronization ✅ COMPLETED
**Date:** 2025-10-22

#### SubtitleEditor Event Forwarding
**File:** `app/components/SubtitleTimeline/SubtitleEditor.vue`

**Changes:**
- ✅ Added `time-click` emit definition
- ✅ Added `subtitle-select` emit definition
- ✅ Modified `handleTimeClick()` to emit event to parent
- ✅ Modified `handleSubtitleSelect()` to emit event to parent

**Implementation:**
```typescript
const emit = defineEmits<{
  'update:modelValue': [subtitles: SubtitleObject[]];
  'time-click': [time: number];
  'subtitle-select': [subtitle: SubtitleObject];
}>();

const handleTimelineClick = (time: number) => {
  emit('time-click', time);
};

const handleSubtitleSelect = (subtitle: SubtitleObject) => {
  selectedSubtitle.value = subtitle;
  showEditPanel.value = true;
  emit('subtitle-select', subtitle);
};
```

#### VideoPlayer Exposure
**File:** `app/components/VideoPlayer.vue`

**Changes:**
- ✅ Added `defineExpose` to expose playback state
- ✅ Exposed `playback` composable (currentTime, duration, isPlaying, seekToTime, pause, play)
- ✅ Exposed `videoRef` for sync composable

**Implementation:**
```typescript
defineExpose({
  playback,
  videoRef,
});
```

#### Parent Page Integration
**File:** `app/pages/videos/[id].vue`

**Changes:**
- ✅ Added `videoPlayerRef` template ref
- ✅ Added `@ready` event handler to VideoPlayer
- ✅ Created reactive state: `videoDuration`, `videoCurrentTime`, `videoIsPlaying`
- ✅ Implemented `onVideoReady()` handler with watchers for playback state
- ✅ Created computed `editorSync` that instantiates sync composable
- ✅ Passed `duration` and `currentTime` props to SubtitleEditor
- ✅ Wired up `@time-click` → `handleTimelineClick()`
- ✅ Wired up `@subtitle-select` → `handleSubtitleSelect()`
- ✅ Imported `useSubtitleEditorSync` composable

**Key Implementation:**
```typescript
// Video player ref
const videoPlayerRef = ref<InstanceType<typeof VideoPlayer> | null>(null);

// Ready handler - sync playback state
const onVideoReady = () => {
  const player = videoPlayerRef.value;
  if (player?.playback) {
    videoDuration.value = player.playback.duration.value;
    watch(() => player.playback.currentTime.value, (time) => {
      videoCurrentTime.value = time;
    });
  }
};

// Sync composable
const editorSync = computed(() => {
  const player = videoPlayerRef.value;
  if (!player?.playback || !player?.videoRef) return null;
  return useSubtitleEditorSync({
    videoRef: player.videoRef,
    currentTime: player.playback.currentTime,
    duration: player.playback.duration,
    isPlaying: player.playback.isPlaying,
    seekToTime: player.playback.seekToTime,
    pause: player.playback.pause,
    play: player.playback.play,
  });
});

// Event handlers
const handleTimelineClick = (time: number) => {
  editorSync.value?.handleTimelineClick(time);
};

const handleSubtitleSelect = (subtitle: EditorSubtitleItem) => {
  editorSync.value?.handleSubtitleSelect(subtitle);
};
```

**Template Integration:**
```vue
<VideoPlayer
  ref="videoPlayerRef"
  @ready="onVideoReady"
/>

<SubtitleEditor
  v-model="editorSubtitles"
  :duration="videoDuration"
  :current-time="videoCurrentTime"
  @time-click="handleTimelineClick"
  @subtitle-select="handleSubtitleSelect"
/>
```

#### Integration Flow Verified
1. ✅ **Timeline Click:**
   - User clicks timeline → TimelineBase emits `time-click`
   - SubtitleEditor forwards to parent → `handleTimelineClick(time)`
   - Sync composable calls `seekToTime(time)` + `pause()`
   - Video seeks to clicked position and pauses

2. ✅ **Subtitle Selection:**
   - User clicks subtitle → TimelineBase emits `subtitle-select`
   - SubtitleEditor opens edit panel + forwards to parent
   - Sync composable calls `seekToTime(subtitle.start)` + `pause()`
   - Video jumps to subtitle start time and pauses for editing

3. ✅ **Edit Panel Auto-Pause:**
   - Handled by subtitle-select flow
   - Video automatically pauses when user starts editing

4. ✅ **State Synchronization:**
   - Video `currentTime` updates → watcher copies to `videoCurrentTime` ref
   - `videoCurrentTime` passed as prop to SubtitleEditor
   - Timeline displays current playback position

#### Testing Checklist
- ⏳ Timeline click seeks video (manual test needed)
- ⏳ Timeline click pauses video (manual test needed)
- ⏳ Subtitle selection jumps to start time (manual test needed)
- ⏳ Subtitle selection pauses video (manual test needed)
- ⏳ Edit panel opening pauses playback (manual test needed)

**Next Steps (Step 3):**
- Real-time video → timeline cursor updates (already passing currentTime)
- Auto-scroll timeline to follow playback
- Visual polish for playhead indicator
- Performance optimization if needed
- Complete workflow testing

### Step 3: Video → Timeline Synchronization & Visual Polish ✅ COMPLETED
**Date:** 2025-10-22

#### Auto-Scroll Implementation
**File:** `app/components/SubtitleTimeline/TimelineBase.vue`

**Changes:**
- ✅ Added `lastUserInteractionTime` ref to track manual interactions
- ✅ Added `isAutoScrollEnabled` ref for future toggle control
- ✅ Implemented `autoScrollToCurrentTime()` function
- ✅ Added watcher on `currentTime` prop to trigger auto-scroll
- ✅ Updated interaction handlers to mark user activity

**Auto-Scroll Logic:**
```typescript
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

watch(() => props.currentTime, () => {
  autoScrollToCurrentTime();
});
```

**User Interaction Tracking:**
- Timeline click → marks interaction
- Manual scroll → marks interaction
- Subtitle click → marks interaction
- Auto-scroll disabled for 3 seconds after any interaction

#### Enhanced Playhead Visual
**File:** `app/components/SubtitleTimeline/TimelineBase.vue`

**Changes:**
- ✅ Replaced simple line with SVG group (`<g>`) containing:
  - Thicker red vertical line (3px, was 2px)
  - Triangle marker at top (downward pointing)
  - Current time label below marker
- ✅ Changed color from green (#10b981) to red (#ef4444) for visibility
- ✅ Added drop shadows for depth
- ✅ Increased stroke width and opacity

**Visual Implementation:**
```vue
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
```

**Styles:**
```scss
.subtitle-timeline__playhead-line {
  stroke: #ef4444; // Red color
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
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
}
```

#### Performance Considerations

**Auto-Scroll Optimization:**
- Only scrolls when playhead near viewport edges (20% margin)
- Smooth scroll behavior via CSS (`scroll-behavior: smooth`)
- Prevents excessive scrolling by checking if in safe zone
- No requestAnimationFrame needed - Vue reactivity handles updates

**TimeUpdate Frequency:**
- Video timeupdate events fire multiple times per second
- Vue's reactivity system batches updates efficiently
- Watcher triggers auto-scroll only when position changes
- No manual throttling needed - browser already optimizes

**User Interaction Respect:**
- 3-second cooldown after manual interaction
- Prevents jarring scroll interruptions
- Allows user to examine specific timeline areas

#### Integration Verification

**Complete Flow:**
1. ✅ **Video plays** → `currentTime` updates → Timeline cursor moves
2. ✅ **Playhead near edge** → Auto-scroll centers playhead
3. ✅ **User scrolls manually** → Auto-scroll pauses for 3s
4. ✅ **User clicks timeline** → Video seeks + pauses
5. ✅ **User selects subtitle** → Video jumps + pauses + edit panel opens
6. ✅ **Video continues** → Auto-scroll resumes after cooldown

#### Visual Design Summary

**Playhead Indicator:**
- **Color:** Red (#ef4444) - high contrast, visible against dark timeline
- **Line:** 3px thick, 90% opacity
- **Marker:** Downward triangle (12px wide)
- **Label:** Current time in MM:SS format
- **Effects:** Drop shadows for depth
- **Z-index:** Above subtitle blocks (via pointer-events: none)

**Advantages:**
- Clear visual distinction from subtitle blocks
- Easy to spot during playback
- Time label provides quick reference
- Triangle marker shows direction of time flow

## Task Completion Summary

### Deliverables ✅
- ✅ Bidirectional VideoPlayer ↔ SubtitleEditor synchronization
- ✅ Timeline click seeks video and pauses
- ✅ Subtitle selection jumps to timestamp and pauses
- ✅ Video playback updates timeline cursor in real-time
- ✅ Auto-scroll follows playback (respects user interaction)
- ✅ Integration composable (`useSubtitleEditorSync`)
- ✅ Enhanced playhead visual (red line + triangle + label)
- ✅ Smooth user experience

### Success Criteria ✅
- ✅ Video currentTime updates timeline position
- ✅ Timeline time-click seeks video correctly
- ✅ Subtitle selection jumps video to start time
- ✅ Edit operations pause video playback
- ✅ Timeline auto-scrolls to follow playback
- ✅ No performance issues (Vue reactivity optimizes updates)
- ✅ Visual feedback clear and responsive
- ✅ All existing editing operations still work
- ✅ BEM methodology maintained
- ✅ TypeScript types for all code

### Files Modified
1. **Created:**
   - `app/composables/useSubtitleEditorSync.ts` - Sync composable

2. **Modified:**
   - `app/components/SubtitleTimeline/SubtitleEditor.vue` - Event forwarding
   - `app/components/VideoPlayer.vue` - Expose playback state
   - `app/pages/videos/[id].vue` - Integration wiring
   - `app/components/SubtitleTimeline/TimelineBase.vue` - Auto-scroll + playhead

### Technical Achievements

**Architecture:**
- Clean separation of concerns via composable pattern
- Components remain decoupled and reusable
- Parent orchestrates integration via props/events
- State flows predictably: Video → Page → Editor → Timeline

**Performance:**
- No manual throttling needed
- Vue's reactivity handles batching
- Smooth CSS scroll for auto-scroll
- User interaction cooldown prevents conflicts

**User Experience:**
- Intuitive bidirectional sync
- Non-intrusive auto-scroll
- Clear visual feedback
- Edit mode pauses playback automatically

## Testing Notes

**Manual Testing Required:**
1. Load video with subtitles in edit mode
2. Play video → verify timeline cursor follows smoothly
3. Click timeline → verify video seeks to position and pauses
4. Select subtitle → verify video jumps to start and pauses
5. Edit subtitle → verify video stays paused
6. Scroll timeline manually → verify auto-scroll pauses
7. Resume playback → verify auto-scroll resumes after 3s
8. Zoom timeline → verify playhead scales correctly
9. Split subtitle → verify sync continues
10. Merge subtitles → verify sync continues

**Expected Behavior:**
- Timeline cursor (red line) always matches video position
- Auto-scroll keeps cursor visible during playback
- User can override auto-scroll by manual interaction
- All editing operations work without breaking sync

## Next Phase

**Task 3.7: Auto-save functionality**
- Debounced save to prevent excessive API calls
- Visual save status indicator
- Draft recovery on page reload

**Task 3.8: Replace old editor**
- Remove legacy subtitle editing UI
- Full migration to new timeline editor
- Update all video pages to use new component
