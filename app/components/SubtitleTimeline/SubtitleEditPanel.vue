<template>
  <div v-if="show && subtitle" class="subtitle-edit-panel">
    <div class="subtitle-edit-panel__header">
      <h3 class="subtitle-edit-panel__title">Edit Subtitle</h3>
      <button class="subtitle-edit-panel__close" aria-label="Close" @click="handleClose">
        <Icon name="lucide:x" />
      </button>
    </div>

    <div class="subtitle-edit-panel__content">
      <!-- Multi-language text inputs -->
      <div class="subtitle-edit-panel__section">
        <div class="subtitle-edit-panel__field">
          <label class="subtitle-edit-panel__label" for="text-th">
            ข้อความภาษาไทย (Thai Text)
          </label>
          <textarea
            id="text-th"
            v-model="textTh"
            class="subtitle-edit-panel__textarea"
            rows="3"
            placeholder="Enter Thai text..."
          />
          <span class="subtitle-edit-panel__char-count"> {{ textTh.length }} characters </span>
        </div>

        <div class="subtitle-edit-panel__field">
          <label class="subtitle-edit-panel__label" for="text-en"> English Text </label>
          <textarea
            id="text-en"
            v-model="textEn"
            class="subtitle-edit-panel__textarea"
            rows="3"
            placeholder="Enter English text..."
          />
          <span class="subtitle-edit-panel__char-count"> {{ textEn.length }} characters </span>
        </div>

        <div class="subtitle-edit-panel__field">
          <label class="subtitle-edit-panel__label" for="text-ru">
            Текст на русском (Russian Text)
          </label>
          <textarea
            id="text-ru"
            v-model="textRu"
            class="subtitle-edit-panel__textarea"
            rows="3"
            placeholder="Введите русский текст..."
          />
          <span class="subtitle-edit-panel__char-count"> {{ textRu.length }} characters </span>
        </div>
      </div>

      <!-- Time controls -->
      <div class="subtitle-edit-panel__section">
        <h4 class="subtitle-edit-panel__section-title">Timing</h4>

        <div class="subtitle-edit-panel__time-row">
          <div class="subtitle-edit-panel__time-field">
            <label class="subtitle-edit-panel__time-label" for="start-time">
              Start (seconds)
            </label>
            <input
              id="start-time"
              v-model.number="startTime"
              type="number"
              class="subtitle-edit-panel__time-input"
              :class="{ 'subtitle-edit-panel__time-input_error': !isStartTimeValid }"
              step="0.1"
              min="0"
            />
            <span class="subtitle-edit-panel__time-display">
              {{ formatTime(startTime) }}
            </span>
          </div>

          <div class="subtitle-edit-panel__time-field">
            <label class="subtitle-edit-panel__time-label" for="end-time"> End (seconds) </label>
            <input
              id="end-time"
              v-model.number="endTime"
              type="number"
              class="subtitle-edit-panel__time-input"
              :class="{ 'subtitle-edit-panel__time-input_error': !isEndTimeValid }"
              step="0.1"
              min="0"
            />
            <span class="subtitle-edit-panel__time-display">
              {{ formatTime(endTime) }}
            </span>
          </div>
        </div>

        <div v-if="!isValid" class="subtitle-edit-panel__error">
          {{ validationError }}
        </div>
      </div>
    </div>

    <div class="subtitle-edit-panel__footer">
      <UIButton variant="danger" size="sm" @click="handleDeleteClick">
        <Icon name="lucide:trash-2" />
        Delete
      </UIButton>

      <UIButton variant="secondary" size="sm" :disabled="!canSplit" @click="handleSplit">
        <Icon name="lucide:scissors" />
        Split
      </UIButton>

      <UIButton 
        variant="secondary" 
        size="sm" 
        :disabled="!canMerge" 
        :title="!canMerge ? 'No adjacent subtitle to merge' : ''"
        @click="handleMerge"
      >
        <Icon name="lucide:git-merge" />
        Merge Next
      </UIButton>

      <div class="subtitle-edit-panel__footer-spacer" />

      <UIButton variant="secondary" @click="handleCancel"> Cancel </UIButton>
      <UIButton variant="primary" :disabled="!isValid" @click="handleSave"> Save </UIButton>
    </div>

    <!-- Delete Confirmation Modal -->
    <DeleteConfirmationModal
      v-model:open="showDeleteConfirmation"
      title="Delete Subtitle"
      message="Are you sure you want to delete this subtitle? This action cannot be undone."
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
import DeleteConfirmationModal from '~/components/modals/DeleteConfirmationModal.vue';

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

interface Props {
  subtitle: SubtitleObject | null;
  show: boolean;
  currentTime?: number;
  allSubtitles?: SubtitleObject[];
}

interface Emits {
  (e: 'save', subtitle: SubtitleObject): void;
  (e: 'cancel'): void;
  (e: 'close'): void;
  (e: 'delete', subtitleId: string | number): void;
  (
    e: 'split-subtitle',
    payload: { firstSegment: SubtitleObject; secondSegment: SubtitleObject; originalId: string | number }
  ): void;
  (
    e: 'merge-subtitle',
    payload: { mergedSubtitle: SubtitleObject; removeId: string | number }
  ): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Reactive text values for each language
const textTh = ref('');
const textEn = ref('');
const textRu = ref('');

// Reactive time values
const startTime = ref(0);
const endTime = ref(0);

// Delete confirmation modal state
const showDeleteConfirmation = ref(false);

// Initialize text values from subtitle prop
const initializeTextFields = () => {
  if (!props.subtitle) {
    textTh.value = '';
    textEn.value = '';
    textRu.value = '';
    startTime.value = 0;
    endTime.value = 0;
    return;
  }

  const { text, start, end } = props.subtitle;

  // Initialize time values
  startTime.value = start || 0;
  endTime.value = end || 0;

  // Handle different text structures
  if (typeof text === 'object' && text !== null) {
    textTh.value = text.th || '';
    textEn.value = text.en || '';
    textRu.value = text.ru || '';
  } else if (typeof text === 'string') {
    // If string, initialize all fields with same value
    textTh.value = text;
    textEn.value = text;
    textRu.value = text;
  } else {
    textTh.value = '';
    textEn.value = '';
    textRu.value = '';
  }
};

// Watch for subtitle changes to reinitialize fields
watch(
  () => props.subtitle,
  () => {
    initializeTextFields();
  },
  { immediate: true }
);

// Validation
const isStartTimeValid = computed(() => {
  return startTime.value >= 0;
});

const isEndTimeValid = computed(() => {
  return endTime.value > startTime.value;
});

const isValid = computed(() => {
  return isStartTimeValid.value && isEndTimeValid.value;
});

const validationError = computed(() => {
  if (!isStartTimeValid.value) {
    return 'Start time must be greater than or equal to 0';
  }
  if (!isEndTimeValid.value) {
    return 'End time must be greater than start time';
  }
  return '';
});

// Format time helper (seconds to MM:SS.s)
const formatTime = (seconds: number): string => {
  if (!seconds || seconds < 0) return '0:00.0';

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const wholeSeconds = Math.floor(secs);
  const decimal = Math.floor((secs - wholeSeconds) * 10);

  return `${minutes}:${wholeSeconds.toString().padStart(2, '0')}.${decimal}`;
};

const handleSave = () => {
  if (!props.subtitle || !isValid.value) return;

  // Construct updated subtitle object with all changes
  const updatedSubtitle: SubtitleObject = {
    id: props.subtitle.id,
    start: startTime.value,
    end: endTime.value,
    text: {
      th: textTh.value,
      en: textEn.value,
      ru: textRu.value,
    },
  };

  emit('save', updatedSubtitle);
  emit('close');
};

const handleCancel = () => {
  initializeTextFields(); // Reset to original values
  emit('cancel');
  emit('close');
};

const handleClose = () => {
  initializeTextFields(); // Reset to original values
  emit('cancel');
  emit('close');
};

// Check if subtitle has content
const hasContent = computed(() => {
  if (!props.subtitle) return false;

  const { text } = props.subtitle;

  if (typeof text === 'object' && text !== null) {
    return !!(text.th || text.en || text.ru);
  } else if (typeof text === 'string') {
    return !!text.trim();
  }

  return false;
});

// Handle delete button click
const handleDeleteClick = () => {
  if (hasContent.value) {
    // Show confirmation for subtitles with content
    showDeleteConfirmation.value = true;
  } else {
    // Delete immediately for empty subtitles
    confirmDelete();
  }
};

// Confirm and execute deletion
const confirmDelete = () => {
  if (!props.subtitle) return;

  emit('delete', props.subtitle.id);
  emit('close');
  showDeleteConfirmation.value = false;
};

// Cancel delete confirmation
const cancelDelete = () => {
  showDeleteConfirmation.value = false;
};

// Split validation
const MIN_SEGMENT_DURATION = 0.5;
const MIN_TOTAL_DURATION_FOR_SPLIT = 1.0;

const canSplit = computed(() => {
  if (!props.subtitle) return false;
  const duration = endTime.value - startTime.value;
  return duration >= MIN_TOTAL_DURATION_FOR_SPLIT;
});

const calculateSplitPosition = (): number => {
  if (!props.subtitle) return 0;

  const { start, end } = props.subtitle;
  const middle = (start + end) / 2;

  // Priority 1: Use current playback time if within subtitle range
  if (props.currentTime && props.currentTime > start && props.currentTime < end) {
    const playbackPos = props.currentTime;
    
    // Ensure both segments meet minimum duration
    const firstSegmentDuration = playbackPos - start;
    const secondSegmentDuration = end - playbackPos;
    
    if (firstSegmentDuration >= MIN_SEGMENT_DURATION && secondSegmentDuration >= MIN_SEGMENT_DURATION) {
      return playbackPos;
    }
  }

  // Priority 2: Use middle of subtitle
  return middle;
};

// Handle split subtitle
const handleSplit = () => {
  if (!props.subtitle || !canSplit.value) return;

  const toast = useToast();
  const splitTime = calculateSplitPosition();

  // Validate split position
  const firstDuration = splitTime - startTime.value;
  const secondDuration = endTime.value - splitTime;

  if (firstDuration < MIN_SEGMENT_DURATION || secondDuration < MIN_SEGMENT_DURATION) {
    toast.add({
      title: 'Cannot Split',
      description: `Both segments must be at least ${MIN_SEGMENT_DURATION} seconds`,
      color: 'red',
    });
    return;
  }

  // Generate unique ID for second segment
  const newId = `subtitle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // First segment (existing subtitle modified)
  const firstSegment: SubtitleObject = {
    id: props.subtitle.id,
    start: startTime.value,
    end: splitTime,
    text: {
      th: textTh.value,
      en: textEn.value,
      ru: textRu.value,
    },
  };

  // Second segment (new subtitle created)
  const secondSegment: SubtitleObject = {
    id: newId,
    start: splitTime,
    end: endTime.value,
    text: {
      th: textTh.value, // Same text initially
      en: textEn.value,
      ru: textRu.value,
    },
  };

  // Emit split event
  emit('split-subtitle', {
    firstSegment,
    secondSegment,
    originalId: props.subtitle.id,
  });

  // Toast notification
  toast.add({
    title: 'Subtitle Split',
    description: 'Edit the second segment as needed',
    color: 'blue',
  });
};

// Merge validation and logic
const MAX_MERGE_GAP = 0.2;

// Find next adjacent subtitle
const nextSubtitle = computed(() => {
  if (!props.subtitle || !props.allSubtitles) return null;

  // Sort subtitles by start time
  const sorted = [...props.allSubtitles].sort((a, b) => a.start - b.start);
  
  // Find current subtitle index
  const currentIndex = sorted.findIndex((s) => s.id === props.subtitle!.id);
  
  if (currentIndex === -1 || currentIndex === sorted.length - 1) return null;
  
  return sorted[currentIndex + 1];
});

// Check if next subtitle is adjacent (can be merged)
const canMerge = computed(() => {
  if (!props.subtitle || !nextSubtitle.value) return false;
  
  const gap = nextSubtitle.value.start - endTime.value;
  return gap < MAX_MERGE_GAP;
});

// Merge text from two subtitles
const mergeText = (
  text1: string | { th?: string; en?: string; ru?: string },
  text2: string | { th?: string; en?: string; ru?: string }
): { th: string; en: string; ru: string } => {
  // Handle object structure (multi-language)
  if (typeof text1 === 'object' && text1 !== null && typeof text2 === 'object' && text2 !== null) {
    return {
      th: [text1.th, text2.th].filter(Boolean).join(' '),
      en: [text1.en, text2.en].filter(Boolean).join(' '),
      ru: [text1.ru, text2.ru].filter(Boolean).join(' '),
    };
  }

  // Handle mixed types - convert to object
  const t1 = typeof text1 === 'string' ? { th: text1, en: text1, ru: text1 } : text1 || { th: '', en: '', ru: '' };
  const t2 = typeof text2 === 'string' ? { th: text2, en: text2, ru: text2 } : text2 || { th: '', en: '', ru: '' };

  return {
    th: [t1.th, t2.th].filter(Boolean).join(' '),
    en: [t1.en, t2.en].filter(Boolean).join(' '),
    ru: [t1.ru, t2.ru].filter(Boolean).join(' '),
  };
};

// Handle merge subtitle
const handleMerge = () => {
  if (!props.subtitle || !nextSubtitle.value || !canMerge.value) return;

  const toast = useToast();

  // Merge text from both subtitles
  const mergedText = mergeText(
    { th: textTh.value, en: textEn.value, ru: textRu.value },
    nextSubtitle.value.text
  );

  // Create merged subtitle
  const mergedSubtitle: SubtitleObject = {
    id: props.subtitle.id, // Keep current ID
    start: startTime.value,
    end: nextSubtitle.value.end,
    text: mergedText,
  };

  // Emit merge event
  emit('merge-subtitle', {
    mergedSubtitle,
    removeId: nextSubtitle.value.id,
  });

  // Toast notification
  toast.add({
    title: 'Subtitles Merged',
    color: 'blue',
  });
};

// Keyboard shortcuts
const handleKeyDown = (event: KeyboardEvent) => {
  if (!props.show) return;

  // Escape: Cancel/close
  if (event.key === 'Escape') {
    event.preventDefault();
    handleCancel();
  }

  // Delete: Delete subtitle
  if (event.key === 'Delete') {
    event.preventDefault();
    handleDeleteClick();
  }

  // Ctrl+K or Cmd+K: Split subtitle
  if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
    event.preventDefault();
    if (canSplit.value) {
      handleSplit();
    }
  }

  // Ctrl+J or Cmd+J: Merge with next subtitle
  if ((event.ctrlKey || event.metaKey) && event.key === 'j') {
    event.preventDefault();
    if (canMerge.value) {
      handleMerge();
    }
  }

  // Ctrl+Enter or Cmd+Enter: Save
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    if (isValid.value) {
      handleSave();
    }
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped>
.subtitle-edit-panel {
  position: fixed;
  right: 0;
  top: 0;
  width: 400px;
  height: 100vh;
  background: var(--color-surface, #ffffff);
  border-left: 1px solid var(--color-border, #e5e7eb);
  box-shadow: -4px 0 16px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  z-index: 1000;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.subtitle-edit-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-border, #e5e7eb);
}

.subtitle-edit-panel__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary, #111827);
}

.subtitle-edit-panel__close {
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: var(--color-text-secondary, #6b7280);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition:
    background-color 0.2s,
    color 0.2s;
}

.subtitle-edit-panel__close:hover {
  background-color: var(--color-hover, #f3f4f6);
  color: var(--color-text-primary, #111827);
}

.subtitle-edit-panel__content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.subtitle-edit-panel__footer {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--color-border, #e5e7eb);
}

.subtitle-edit-panel__footer-spacer {
  flex: 1;
}

.subtitle-edit-panel__section {
  margin-bottom: 24px;
}

.subtitle-edit-panel__field {
  margin-bottom: 20px;
}

.subtitle-edit-panel__field:last-child {
  margin-bottom: 0;
}

.subtitle-edit-panel__label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary, #374151);
}

.subtitle-edit-panel__textarea {
  width: 100%;
  padding: 12px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--color-text-primary, #111827);
  background-color: var(--color-input-bg, #ffffff);
  border: 1px solid var(--color-border, #d1d5db);
  border-radius: 6px;
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.subtitle-edit-panel__textarea:focus {
  outline: none;
  border-color: var(--color-primary, #3b82f6);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.subtitle-edit-panel__textarea::placeholder {
  color: var(--color-text-placeholder, #9ca3af);
}

.subtitle-edit-panel__char-count {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: var(--color-text-secondary, #6b7280);
  text-align: right;
}

.subtitle-edit-panel__section-title {
  margin: 0 0 16px 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary, #111827);
}

.subtitle-edit-panel__time-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.subtitle-edit-panel__time-field {
  display: flex;
  flex-direction: column;
}

.subtitle-edit-panel__time-label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary, #374151);
}

.subtitle-edit-panel__time-input {
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  color: var(--color-text-primary, #111827);
  background-color: var(--color-input-bg, #ffffff);
  border: 1px solid var(--color-border, #d1d5db);
  border-radius: 6px;
  font-family: inherit;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.subtitle-edit-panel__time-input:focus {
  outline: none;
  border-color: var(--color-primary, #3b82f6);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.subtitle-edit-panel__time-input_error {
  border-color: var(--color-error, #ef4444);
}

.subtitle-edit-panel__time-input_error:focus {
  border-color: var(--color-error, #ef4444);
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.subtitle-edit-panel__time-display {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  font-family: 'Courier New', monospace;
  color: var(--color-text-secondary, #6b7280);
}

.subtitle-edit-panel__error {
  margin-top: 12px;
  padding: 10px 12px;
  font-size: 13px;
  color: var(--color-error-text, #991b1b);
  background-color: var(--color-error-bg, #fee2e2);
  border: 1px solid var(--color-error, #ef4444);
  border-radius: 6px;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .subtitle-edit-panel {
    background: var(--color-surface, #1f2937);
    border-left-color: var(--color-border, #374151);
  }

  .subtitle-edit-panel__header,
  .subtitle-edit-panel__footer {
    border-color: var(--color-border, #374151);
  }

  .subtitle-edit-panel__title {
    color: var(--color-text-primary, #f9fafb);
  }

  .subtitle-edit-panel__close {
    color: var(--color-text-secondary, #9ca3af);
  }

  .subtitle-edit-panel__close:hover {
    background-color: var(--color-hover, #374151);
    color: var(--color-text-primary, #f9fafb);
  }

  .subtitle-edit-panel__label {
    color: var(--color-text-primary, #f3f4f6);
  }

  .subtitle-edit-panel__textarea {
    color: var(--color-text-primary, #f9fafb);
    background-color: var(--color-input-bg, #374151);
    border-color: var(--color-border, #4b5563);
  }

  .subtitle-edit-panel__textarea:focus {
    border-color: var(--color-primary, #60a5fa);
    box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
  }

  .subtitle-edit-panel__char-count {
    color: var(--color-text-secondary, #9ca3af);
  }

  .subtitle-edit-panel__section-title {
    color: var(--color-text-primary, #f9fafb);
  }

  .subtitle-edit-panel__time-label {
    color: var(--color-text-primary, #f3f4f6);
  }

  .subtitle-edit-panel__time-input {
    color: var(--color-text-primary, #f9fafb);
    background-color: var(--color-input-bg, #374151);
    border-color: var(--color-border, #4b5563);
  }

  .subtitle-edit-panel__time-input:focus {
    border-color: var(--color-primary, #60a5fa);
    box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
  }

  .subtitle-edit-panel__time-display {
    color: var(--color-text-secondary, #9ca3af);
  }

  .subtitle-edit-panel__error {
    color: var(--color-error-text, #fca5a5);
    background-color: var(--color-error-bg, #7f1d1d);
    border-color: var(--color-error, #dc2626);
  }
}
</style>
