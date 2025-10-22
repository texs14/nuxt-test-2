import { ref, type Ref } from 'vue';
import { useDebounceFn } from '@vueuse/core';

/**
 * Auto-save composable for subtitle editor
 * Provides debounced saving with retry logic and state management
 */

export interface SubtitleObject {
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

export interface UseSubtitleAutoSaveOptions {
  /** Video or lesson ID */
  itemId: Ref<string | number>;
  /** Item type: 'video' or 'lesson' */
  itemType: 'video' | 'lesson';
  /** Debounce delay in milliseconds (default: 2000) */
  debounceMs?: number;
  /** Maximum retry attempts (default: 3) */
  maxRetries?: number;
  /** Data transformation function to convert editor format to database format */
  transformPayload: (subtitles: SubtitleObject[]) => any[];
}

export enum SaveStatus {
  IDLE = 'idle',
  UNSAVED = 'unsaved',
  SAVING = 'saving',
  SAVED = 'saved',
  ERROR = 'error',
}

export const useSubtitleAutoSave = (options: UseSubtitleAutoSaveOptions) => {
  const {
    itemId,
    itemType,
    debounceMs = 2000,
    maxRetries = 3,
    transformPayload,
  } = options;

  // State
  const status = ref<SaveStatus>(SaveStatus.IDLE);
  const isSaving = ref(false);
  const lastSavedAt = ref<Date | null>(null);
  const hasUnsavedChanges = ref(false);
  const saveError = ref<string | null>(null);

  // Constants
  const RETRY_DELAY_BASE = 1000; // 1 second

  /**
   * Sleep utility for retry delays
   */
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  /**
   * Core save function with retry logic
   */
  const saveToDatabase = async (
    subtitles: SubtitleObject[],
    attempt: number = 1
  ): Promise<void> => {
    try {
      const endpoint =
        itemType === 'video'
          ? `/api/video-items/${encodeURIComponent(String(itemId.value))}`
          : `/api/lesson-items/${encodeURIComponent(String(itemId.value))}`;

      const payload = {
        subtitles: transformPayload(subtitles),
      };

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json?.error || 'Failed to save subtitles');
      }

      // Save successful
      saveError.value = null;
      lastSavedAt.value = new Date();
      hasUnsavedChanges.value = false;
      status.value = SaveStatus.SAVED;
    } catch (error: any) {
      console.error(`Save attempt ${attempt} failed:`, error);

      // Retry logic
      if (attempt < maxRetries) {
        const delay = RETRY_DELAY_BASE * Math.pow(2, attempt - 1);
        console.log(`Retrying in ${delay}ms...`);
        await sleep(delay);
        return saveToDatabase(subtitles, attempt + 1);
      }

      // All retries exhausted
      saveError.value = error?.message || 'Failed to save subtitles';
      status.value = SaveStatus.ERROR;
      hasUnsavedChanges.value = true;

      // Show error toast
      const toast = useToast();
      toast.add({
        title: 'Save Failed',
        description: saveError.value,
        color: 'red',
        timeout: 5000,
      });

      throw error;
    }
  };

  /**
   * Debounced save function
   */
  const debouncedSave = useDebounceFn(async (subtitles: SubtitleObject[]) => {
    if (isSaving.value) {
      console.log('Save already in progress, skipping...');
      return;
    }

    isSaving.value = true;
    status.value = SaveStatus.SAVING;

    try {
      await saveToDatabase(subtitles);
    } catch (error) {
      // Error already handled in saveToDatabase
    } finally {
      isSaving.value = false;
    }
  }, debounceMs);

  /**
   * Queue a save operation (debounced)
   * Call this after every subtitle change
   */
  const queueSave = (subtitles: SubtitleObject[]) => {
    hasUnsavedChanges.value = true;
    status.value = SaveStatus.UNSAVED;
    debouncedSave(subtitles);
  };

  /**
   * Save immediately (bypass debounce)
   * Useful for manual "Save Now" button
   */
  const saveNow = async (subtitles: SubtitleObject[]): Promise<void> => {
    // Cancel any pending debounced save
    debouncedSave.cancel();

    if (isSaving.value) {
      console.log('Save already in progress');
      return;
    }

    isSaving.value = true;
    status.value = SaveStatus.SAVING;

    try {
      await saveToDatabase(subtitles);
    } catch (error) {
      // Error already handled in saveToDatabase
      throw error;
    } finally {
      isSaving.value = false;
    }
  };

  /**
   * Check if there are unsaved changes before leaving
   */
  const hasUnsaved = (): boolean => {
    return hasUnsavedChanges.value;
  };

  /**
   * Clear error state
   */
  const clearError = () => {
    saveError.value = null;
    if (status.value === SaveStatus.ERROR) {
      status.value = hasUnsavedChanges.value ? SaveStatus.UNSAVED : SaveStatus.IDLE;
    }
  };

  return {
    // State
    status,
    isSaving,
    lastSavedAt,
    hasUnsavedChanges,
    saveError,

    // Methods
    queueSave,
    saveNow,
    hasUnsaved,
    clearError,
  };
};
