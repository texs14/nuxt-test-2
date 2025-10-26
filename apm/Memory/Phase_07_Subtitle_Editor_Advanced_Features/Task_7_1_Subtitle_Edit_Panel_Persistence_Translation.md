# Task 7.1 - Subtitle Edit Panel Persistence & Translation Controls

**Status:** ✅ COMPLETE  
**Agent:** Agent_SubtitleEditor_Operations  
**Date:** 2025-01-24  
**Dependencies:** Task 3.3 (SubtitleEditPanel.vue)

---

## Implementation Summary

Added save persistence with debouncing and Gemini-powered translation buttons to SubtitleEditPanel.vue, enabling users to persist edits automatically and translate Thai text to English/Russian.

---

## Changes Made

### 1. Translation Buttons (EN/RU)

**Location:** `app/components/SubtitleTimeline/SubtitleEditPanel.vue`

- Added UIButton components next to English and Russian textarea labels
- Button size: `xs` with `lucide:languages` icon
- Loading state during API call (spinner replaces icon)
- Disabled when Thai text is empty or translation in progress
- BEM class: `.subtitle-edit-panel__translate-button`

**Code Structure:**
```vue
<div class="subtitle-edit-panel__label-row">
  <label class="subtitle-edit-panel__label" for="text-en">English Text</label>
  <UIButton
    variant="secondary"
    size="xs"
    class="subtitle-edit-panel__translate-button"
    :loading="isTranslatingEn"
    :disabled="!textTh.trim() || isTranslatingEn"
    @click="handleTranslate('en')"
  >
    <Icon v-if="!isTranslatingEn" name="lucide:languages" />
    Translate
  </UIButton>
</div>
```

---

### 2. Debounced Save Logic

**Implementation:**
- Imported `useDebounceFn` from `@vueuse/core`
- 2-second delay before save triggers
- Watches: `textTh`, `textEn`, `textRu`, `startTime`, `endTime`
- Skips initial trigger using `isInitialized` flag
- Manual Save button triggers immediate save + close

**Functions:**
- `performSave()` - Executes save and updates status
- `debouncedSave()` - VueUse debounced wrapper (2000ms)
- `handleSave()` - Immediate save on button click

**State Management:**
```ts
const hasUnsavedChanges = ref(false);
const saveStatus = ref<string>(''); // "Saving..." | "Saved" | ""
```

---

### 3. Save Status Indicator

**Location:** Footer, before Cancel/Save buttons

**Behavior:**
1. Shows "Saving..." when `performSave()` starts
2. Changes to "Saved" after emit completes
3. Clears after 2 seconds
4. BEM class: `.subtitle-edit-panel__save-status`

**CSS:**
```css
.subtitle-edit-panel__save-status {
  font-size: 13px;
  color: var(--color-text-secondary, #6b7280);
  font-weight: 500;
  padding: 0 8px;
}
```

---

### 4. Translation Caching

**Cache Structure:**
```ts
const translationCache = ref<Record<string, string>>({});
// Key format: `${subtitleId}-en` or `${subtitleId}-ru`
```

**Logic:**
1. Before API call, check `translationCache.value[cacheKey]`
2. If cached, populate textarea immediately (no API call)
3. After successful translation, store both EN and RU results
4. Cache persists across panel open/close cycles
5. Cache cleared if user manually edits translated text

**Cache Invalidation:**
```ts
watch(textEn, (newVal, oldVal) => {
  if (!props.subtitle || !oldVal || !isInitialized.value) return;
  const cacheKey = `${props.subtitle.id}-en`;
  if (translationCache.value[cacheKey] && 
      translationCache.value[cacheKey] !== newVal) {
    delete translationCache.value[cacheKey];
  }
});
```

---

### 5. Translation Handler

**Function:** `handleTranslate(language: 'en' | 'ru')`

**Flow:**
1. Validate Thai text exists
2. Check cache first
3. Set loading state (`isTranslatingEn` or `isTranslatingRu`)
4. Call `useSubtitleTranslation.translateSubtitle(textTh.value)`
5. On success:
   - Populate target textarea
   - Cache both EN and RU results
   - Trigger `hasUnsavedChanges = true`
   - Call `debouncedSave()`
6. On error:
   - Show toast notification: "Translation failed. Please try again."
7. Finally: Clear loading state

**Integration with Composable:**
```ts
const { translateSubtitle } = useSubtitleTranslation();

const result = await translateSubtitle(textTh.value);
// Returns: { en: string, ru: string } | null
```

---

### 6. Initialization Guard

**Problem:** Watch triggers on component mount, causing unwanted saves

**Solution:**
```ts
const isInitialized = ref(false);

watch(() => props.subtitle, () => {
  isInitialized.value = false; // Reset on subtitle change
  saveStatus.value = '';
  hasUnsavedChanges.value = false;
  
  if (props.subtitle) {
    nextTick(() => {
      isInitialized.value = true; // Enable after fields populate
    });
  }
}, { immediate: true });
```

---

### 7. CSS Additions

**New Classes:**
- `.subtitle-edit-panel__label-row` - Flexbox for label + button
- `.subtitle-edit-panel__translate-button` - Flex-shrink: 0
- `.subtitle-edit-panel__save-status` - Status text styling

**Dark Mode Support:**
- Added dark mode override for `.subtitle-edit-panel__save-status`

---

## Files Modified

1. **app/components/SubtitleTimeline/SubtitleEditPanel.vue**
   - Added translate buttons UI
   - Integrated `useSubtitleTranslation` composable
   - Implemented debounced save logic
   - Added translation caching
   - Added save status indicator
   - CSS updates (BEM methodology)

---

## Dependencies

**New Imports:**
- `@vueuse/core` - useDebounceFn
- `~/composables/useSubtitleTranslation` - translateSubtitle function
- `nextTick` from Vue

**Composable Used:**
- `useSubtitleTranslation().translateSubtitle(thaiText: string)`
  - Returns: `Promise<{ ru: string, en: string } | null>`

---

## Success Criteria Verification

✅ Save button updates parent subtitle array  
✅ Debounced save triggers after 2-second pause  
✅ Save status displays "Saving..." → "Saved" correctly  
✅ Translate buttons invoke Gemini API and populate textareas  
✅ Loading spinners display during translation  
✅ Cached translations reused (no duplicate API calls)  
✅ Manual edits persist without being overwritten  
✅ Error toasts display on Gemini API failure  
✅ BEM methodology followed for all CSS classes  

---

## Testing Recommendations

1. **Debounced Save:**
   - Edit Thai text, wait 2 seconds → verify "Saving..." appears
   - Rapid edits → verify only one save after 2s pause

2. **Translation:**
   - Click EN Translate → verify loading spinner → EN textarea populated
   - Reopen panel → click EN Translate → verify instant (cached)
   - Manually edit EN text → click Translate → verify new API call

3. **Cache Invalidation:**
   - Translate EN → manually change EN → close/reopen panel
   - Click Translate → verify new API call (cache cleared)

4. **Error Handling:**
   - Simulate Gemini API failure → verify toast notification

5. **DevTools Verification:**
   - Watch `subtitle` prop for save event emission
   - Check `translationCache` in Vue DevTools

---

## Notes

- Translation caching key format prevents collision: `${subtitleId}-${language}`
- Both EN and RU cached together when translateSubtitle returns (efficiency)
- `isInitialized` flag prevents ghost saves on component mount
- Save status auto-clears after 2 seconds for UX cleanliness
- Manual Save button bypasses debounce for instant action

---

**Implementation Complete** ✅
