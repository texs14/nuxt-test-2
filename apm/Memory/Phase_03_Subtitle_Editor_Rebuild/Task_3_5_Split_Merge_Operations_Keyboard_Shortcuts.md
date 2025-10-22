# Task 3.5 - Split and Merge Operations with Keyboard Shortcuts

**Status:** ✅ COMPLETED  
**Agent:** Agent_SubtitleEditor_Operations  
**Completed:** Oct 22, 2025

## Summary
Implemented split and merge functionality for subtitle editing with intelligent positioning, text merging for multi-language support, validation, and keyboard shortcuts (Ctrl+K for split, Ctrl+J for merge).

## Implementation Details

### Step 1: Split Subtitle Operation

#### Split Button
**Location:** SubtitleEditPanel footer (after Delete, before Merge)
- Component: UIButton (variant="secondary", size="sm")
- Icon: Lucide `lucide:scissors`
- Label: "Split"
- Disabled when subtitle duration < 1.0 second

#### Split Position Logic
**Priority-based calculation:**
1. **Primary:** Current video playback time (if within subtitle range and meets minimum duration)
2. **Fallback:** Middle of subtitle duration

**Validation:**
```typescript
const MIN_SEGMENT_DURATION = 0.5; // seconds
const MIN_TOTAL_DURATION_FOR_SPLIT = 1.0; // seconds

const canSplit = computed(() => {
  if (!subtitle) return false;
  const duration = endTime - startTime;
  return duration >= MIN_TOTAL_DURATION_FOR_SPLIT;
});
```

**Event Emission:**
```typescript
emit('split-subtitle', {
  firstSegment,
  secondSegment,
  originalId: subtitle.id
});
```

#### Keyboard Shortcut
- **Ctrl+K** (Cmd+K on Mac): Trigger split
- Only active when edit panel open

### Step 2: Merge Subtitle Operation

#### Merge Button
**Location:** SubtitleEditPanel footer (after Split, before spacer)
- Component: UIButton (variant="secondary", size="sm")
- Icon: Lucide `lucide:git-merge`
- Label: "Merge Next"
- Disabled when no adjacent subtitle or gap > 0.2s

#### Text Merging Strategy
```typescript
const mergeText = (text1, text2) => {
  return {
    th: [text1.th, text2.th].filter(Boolean).join(' '),
    en: [text1.en, text2.en].filter(Boolean).join(' '),
    ru: [text1.ru, text2.ru].filter(Boolean).join(' ')
  };
};
```

#### Keyboard Shortcut
- **Ctrl+J** (Cmd+J on Mac): Trigger merge

## Files Modified
- ✅ Modified: `app/components/SubtitleTimeline/SubtitleEditPanel.vue`
- ✅ Modified: `app/components/SubtitleTimeline/SubtitleEditor.vue`

## Success Criteria Met
✅ Split divides subtitle at appropriate position
✅ Merge combines adjacent subtitles correctly
✅ Multi-language text merged independently
✅ Keyboard shortcuts work when panel open
✅ Buttons disabled when operations invalid
✅ Toast notifications provide clear feedback
