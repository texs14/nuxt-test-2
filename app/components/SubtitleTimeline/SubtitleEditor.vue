<template>
  <div class="subtitle-editor">
    <!-- Empty State -->
    <div v-if="subtitles.length === 0" class="subtitle-editor__empty-state">
      <div class="subtitle-editor__empty-icon">
        <Icon name="lucide:file-text" size="48" />
      </div>
      <p class="subtitle-editor__empty-title">No subtitles yet</p>
      <p class="subtitle-editor__empty-description">
        Click "New Subtitle" to create your first subtitle
      </p>
    </div>

    <!-- Timeline Component -->
    <TimelineBase
      :duration="duration"
      :subtitles="subtitles"
      :current-time="currentTime"
      :save-status="saveStatus"
      :last-saved-at="lastSavedAt"
      :is-saving="isSaving"
      @subtitle-select="handleSubtitleSelect"
      @time-click="handleTimeClick"
      @add-subtitle="handleAddSubtitle"
      @manual-save="emit('manual-save')"
    />

    <!-- Edit Panel Component -->
    <SubtitleEditPanel
      :subtitle="selectedSubtitle"
      :show="showEditPanel"
      :current-time="currentTime"
      :all-subtitles="subtitles"
      @save="handleSave"
      @cancel="handleCancel"
      @close="handleClose"
      @delete="handleDelete"
      @split-subtitle="handleSplit"
      @merge-subtitle="handleMerge"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import TimelineBase from './TimelineBase.vue';
import SubtitleEditPanel from './SubtitleEditPanel.vue';

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
  /** Video duration in seconds */
  duration: number;
  /** Current video playback time */
  currentTime?: number;
  /** Initial subtitles array */
  modelValue?: SubtitleObject[];
  /** Save status from auto-save composable */
  saveStatus?: string;
  /** Last saved timestamp */
  lastSavedAt?: Date | null;
  /** Is currently saving */
  isSaving?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  currentTime: 0,
  modelValue: () => [],
  saveStatus: 'idle',
  lastSavedAt: null,
  isSaving: false,
});

const emit = defineEmits<{
  'update:modelValue': [subtitles: SubtitleObject[]];
  'time-click': [time: number];
  'subtitle-select': [subtitle: SubtitleObject];
  'manual-save': [];
}>();

const toast = useToast();

// Local reactive state
const subtitles = ref<SubtitleObject[]>([...props.modelValue]);
const selectedSubtitle = ref<SubtitleObject | null>(null);
const showEditPanel = ref(false);

// Handle subtitle selection
const handleSubtitleSelect = (subtitle: SubtitleObject) => {
  selectedSubtitle.value = subtitle;
  showEditPanel.value = true;
  // Emit to parent for video synchronization
  emit('subtitle-select', subtitle);
};

// Handle timeline click - forward to parent for video synchronization
const handleTimeClick = (time: number) => {
  emit('time-click', time);
};

// Handle add subtitle
const handleAddSubtitle = (newSubtitle: SubtitleObject) => {
  // Insert in chronological order
  const insertIndex = subtitles.value.findIndex((s) => s.start > newSubtitle.start);

  if (insertIndex === -1) {
    // Add at end
    subtitles.value.push(newSubtitle);
  } else {
    // Insert at specific position
    subtitles.value.splice(insertIndex, 0, newSubtitle);
  }

  // Auto-select and open edit panel
  selectedSubtitle.value = newSubtitle;
  showEditPanel.value = true;

  // Emit update to parent
  emit('update:modelValue', subtitles.value);

  // Show success toast
  toast.add({
    title: 'Subtitle Added',
    description: 'Edit the text and timing as needed',
    color: 'success',
  });
};

// Handle save subtitle
const handleSave = (updatedSubtitle: SubtitleObject) => {
  const index = subtitles.value.findIndex((s) => s.id === updatedSubtitle.id);

  if (index !== -1) {
    // Update existing subtitle
    subtitles.value[index] = updatedSubtitle;

    // Re-sort if timing changed
    subtitles.value.sort((a, b) => a.start - b.start);

    // Emit update to parent
    emit('update:modelValue', subtitles.value);

    // Show success toast
    toast.add({
      title: 'Subtitle Saved',
      color: 'success',
    });
  }

  showEditPanel.value = false;
};

// Handle cancel
const handleCancel = () => {
  showEditPanel.value = false;
};

// Handle close
const handleClose = () => {
  showEditPanel.value = false;
};

// Handle delete subtitle
const handleDelete = (subtitleId: string | number) => {
  const index = subtitles.value.findIndex((s) => s.id === subtitleId);

  if (index !== -1) {
    // Remove subtitle
    subtitles.value.splice(index, 1);

    // Clear selection
    selectedSubtitle.value = null;
    showEditPanel.value = false;

    // Emit update to parent
    emit('update:modelValue', subtitles.value);

    // Show success toast
    toast.add({
      title: 'Subtitle Deleted',
      color: 'error',
    });
  }
};

// Handle split subtitle
const handleSplit = ({
  firstSegment,
  secondSegment,
  originalId,
}: {
  firstSegment: SubtitleObject;
  secondSegment: SubtitleObject;
  originalId: string | number;
}) => {
  const index = subtitles.value.findIndex((s) => s.id === originalId);

  if (index !== -1) {
    // Replace original with two segments
    subtitles.value.splice(index, 1, firstSegment, secondSegment);

    // Auto-select second segment
    selectedSubtitle.value = secondSegment;
    showEditPanel.value = true;

    // Emit update to parent
    emit('update:modelValue', subtitles.value);

    // Toast notification already shown by SubtitleEditPanel
  }
};

// Handle merge subtitle
const handleMerge = ({
  mergedSubtitle,
  removeId,
}: {
  mergedSubtitle: SubtitleObject;
  removeId: string | number;
}) => {
  const currentIndex = subtitles.value.findIndex((s) => s.id === mergedSubtitle.id);
  const removeIndex = subtitles.value.findIndex((s) => s.id === removeId);

  if (currentIndex !== -1 && removeIndex !== -1) {
    // Update current subtitle with merged data
    subtitles.value[currentIndex] = mergedSubtitle;

    // Remove next subtitle
    subtitles.value.splice(removeIndex, 1);

    // Keep merged subtitle selected
    selectedSubtitle.value = mergedSubtitle;
    showEditPanel.value = true;

    // Emit update to parent
    emit('update:modelValue', subtitles.value);

    // Toast notification already shown by SubtitleEditPanel
  }
};
</script>

<style scoped>
.subtitle-editor {
  position: relative;
  width: 100%;
}

.subtitle-editor__empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  background-color: var(--color-surface, #242424);
  border-radius: 8px;
  margin-bottom: 1rem;
}

.subtitle-editor__empty-icon {
  color: var(--color-text-secondary, #888);
  margin-bottom: 1rem;
  opacity: 0.5;
}

.subtitle-editor__empty-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-primary, #e0e0e0);
  margin: 0 0 0.5rem 0;
}

.subtitle-editor__empty-description {
  font-size: 0.875rem;
  color: var(--color-text-secondary, #888);
  margin: 0;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .subtitle-editor__empty-state {
    background-color: var(--color-surface, #1a1a1a);
  }
}
</style>
