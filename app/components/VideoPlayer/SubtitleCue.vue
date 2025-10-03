<template>
  <div
    class="subtitle-cue"
    :class="{ 'subtitle-cue_active': active }"
    @click="$emit('click')"
  >
    <span class="subtitle-cue__time">
      {{ formatTime(subtitle.start) }}–{{ formatTime(subtitle.end) }}
    </span>
    <span v-if="!showAllLangs" class="subtitle-cue__text">
      <span class="subtitle-cue__text-th">{{ getThaiText(subtitle) }}</span>
      <span v-if="getSelectedText(subtitle, locale)" class="subtitle-cue__text-selected">
        — {{ getSelectedText(subtitle, locale) }}
      </span>
    </span>
    <div v-else class="subtitle-cue__text subtitle-cue__text_all">
      <span class="subtitle-cue__text-th">{{ getThaiText(subtitle) }}</span>
      <span v-if="getTextForLocale(subtitle, 'ru')" class="subtitle-cue__text_ru">
        {{ getTextForLocale(subtitle, 'ru') }}
      </span>
      <span v-if="getTextForLocale(subtitle, 'en')" class="subtitle-cue__text_en">
        {{ getTextForLocale(subtitle, 'en') }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NormalizedSubtitle, Locale } from '~/types/video.types';
import { formatTime } from '~/utils/time';
import { getThaiText, getTextForLocale, getSelectedText } from '~/composables/subtitles/useSubtitleText';

defineProps<{
  subtitle: NormalizedSubtitle;
  active: boolean;
  showAllLangs: boolean;
  locale: Locale;
}>();

defineEmits<{
  (e: 'click'): void;
}>();
</script>

<style scoped lang="scss">
.subtitle-cue {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 10px;
  align-items: baseline;
  padding: 8px 10px;
  border-radius: 8px;
  background: #f6f6f6;
  cursor: pointer;
  transition: background 0.2s ease;

  &_active {
    background: #e9f2ff;
  }

  &__time {
    color: #666;
    font-variant-numeric: tabular-nums;
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
</style>
