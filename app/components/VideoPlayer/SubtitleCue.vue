<template>
  <div class="subtitle-cue" :class="{ 'subtitle-cue_active': active }" @click="$emit('click')">
    <div class="subtitle-cue__header">
      <span class="subtitle-cue__time">
        {{ formatTime(subtitle.start) }}–{{ formatTime(subtitle.end) }}
      </span>
      <button
        v-if="canAddToDictionary"
        class="subtitle-cue__add-button"
        :class="{ 'subtitle-cue__add-button_loading': isProcessing }"
        :disabled="isProcessing"
        :title="$t('dictionary.batchProcess.addToDictionary')"
        @click.stop="handleAddToDictionary"
      >
        <svg
          v-if="!isProcessing"
          class="subtitle-cue__add-icon"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        <svg
          v-else
          class="subtitle-cue__add-icon subtitle-cue__add-icon_spinner"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="12" y1="2" x2="12" y2="6"></line>
          <line x1="12" y1="18" x2="12" y2="22"></line>
          <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
          <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
          <line x1="2" y1="12" x2="6" y2="12"></line>
          <line x1="18" y1="12" x2="22" y2="12"></line>
          <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
          <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
        </svg>
      </button>
    </div>
    <span v-if="!showAllLangs" class="subtitle-cue__text">
      <span class="subtitle-cue__text-th">
        <template v-for="(word, index) in getThaiWords(subtitle)" :key="index">
          <InteractiveWord :word="word" />
          <span v-if="index < getThaiWords(subtitle).length - 1"> </span>
        </template>
      </span>
      <span v-if="getSelectedText(subtitle, locale)" class="subtitle-cue__text-selected">
        — {{ getSelectedText(subtitle, locale) }}
      </span>
    </span>
    <div v-else class="subtitle-cue__text subtitle-cue__text_all">
      <span class="subtitle-cue__text-th">
        <template v-for="(word, index) in getThaiWords(subtitle)" :key="index">
          <InteractiveWord :word="word" />
          <span v-if="index < getThaiWords(subtitle).length - 1"> </span>
        </template>
      </span>
      <span v-if="getTextForLocale(subtitle, 'ru')" class="subtitle-cue__text_ru">
        {{ getTextForLocale(subtitle, 'ru') }}
      </span>
      <span v-if="getTextForLocale(subtitle, 'en')" class="subtitle-cue__text_en">
        {{ getTextForLocale(subtitle, 'en') }}
      </span>
    </div>

    <!-- Loader для процесса обработки -->
    <DictionaryProcessLoader
      :is-visible="showLoader"
      :total-words="totalWords"
      :processed-words="progress"
      :current-word="currentWord"
      :success-count="stats.added"
      :skip-count="stats.skipped"
      :error-count="stats.errors"
      :is-complete="!isProcessing && showLoader"
      @cancel="handleCancel"
      @close="handleClose"
    />
  </div>
</template>

<script setup lang="ts">
import type { NormalizedSubtitle, Locale } from '~/types/video.types';
import { formatTime } from '~/utils/time';
import {
  getThaiText,
  getTextForLocale,
  getSelectedText,
} from '~/composables/subtitles/useSubtitleText';

const props = defineProps<{
  subtitle: NormalizedSubtitle;
  active: boolean;
  showAllLangs: boolean;
  locale: Locale;
}>();

defineEmits<{
  (e: 'click'): void;
}>();

const getThaiWords = (subtitle: NormalizedSubtitle): string[] => {
  const text = getThaiText(subtitle);
  return text.split(/\s+/).filter((word) => word.length > 0);
};

// Проверка прав доступа
const supabase = useSupabaseClient();
const user = useSupabaseUser();
const canAddToDictionary = ref(false);

// Batch processing
const { isProcessing, processBatch, cancel, currentWord, progress, totalWords, stats } =
  useDictionaryBatch();
const showLoader = ref(false);
const { t } = useI18n();

// Проверка роли пользователя
watchEffect(async () => {
  if (!user.value) {
    canAddToDictionary.value = false;
    return;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.value.id)
    .single();

  canAddToDictionary.value =
    (profile as any)?.role === 'moderator' || (profile as any)?.role === 'admin';
});

const handleAddToDictionary = async () => {
  if (isProcessing.value) return;

  const words = getThaiWords(props.subtitle);
  if (words.length === 0) {
    alert(t('dictionary.batchProcess.messages.noWords'));
    return;
  }

  showLoader.value = true;

  try {
    await processBatch(words);
    // Автоматически закрыть через 3 секунды после завершения
    setTimeout(() => {
      showLoader.value = false;
      showCompletionMessage();
    }, 3000);
  } catch (error: any) {
    showLoader.value = false;
    alert(t('dictionary.batchProcess.messages.error'));
  }
};

const handleCancel = () => {
  cancel();
  setTimeout(() => {
    showLoader.value = false;
  }, 500);
};

const handleClose = () => {
  showLoader.value = false;
  showCompletionMessage();
};

const showCompletionMessage = () => {
  const added = stats.value.added;
  const total = stats.value.total;
  const skipped = stats.value.skipped;

  if (added === 0 && skipped === total) {
    alert(t('dictionary.batchProcess.messages.allExists'));
  } else if (added > 0) {
    if (added === total) {
      alert(t('dictionary.batchProcess.messages.success', { count: added }));
    } else {
      alert(t('dictionary.batchProcess.messages.partialSuccess', { added, total }));
    }
  }
};
</script>

<style scoped lang="scss">
.subtitle-cue {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #f6f6f6;
  cursor: pointer;
  transition: background 0.2s ease;

  &_active {
    background: #e9f2ff;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  &__time {
    color: #666;
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }

  &__add-button {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    border: none;
    border-radius: 4px;
    background: #3b82f6;
    color: #ffffff;
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;

    &:hover:not(:disabled) {
      background: #2563eb;
      transform: scale(1.05);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    &_loading {
      background: #6b7280;
    }
  }

  &__add-icon {
    display: block;

    &_spinner {
      animation: spin 1s linear infinite;
    }
  }

  &__text {
    color: #111;
  }

  &__text-th {
    font-weight: 600;
  }

  &__text-selected {
    opacity: 0.9;
  }

  &__text_all {
    display: grid;
    gap: 2px;
  }

  &__text_ru {
    opacity: 0.95;
  }

  &__text_en {
    opacity: 0.95;
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
