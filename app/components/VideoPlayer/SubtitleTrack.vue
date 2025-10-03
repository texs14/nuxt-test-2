<template>
  <div v-if="subtitles.length" class="subtitle-track">
    <SubtitleCue
      v-for="(subtitle, index) in subtitles"
      :key="subtitle.id ?? index"
      :subtitle="subtitle"
      :active="index === activeIndex"
      :show-all-langs="showAllLangs"
      :locale="locale"
      @click="$emit('seek-to', index)"
    />
  </div>
</template>

<script setup lang="ts">
import type { NormalizedSubtitle, Locale } from '~/types/video.types';
import SubtitleCue from './SubtitleCue.vue';

defineProps<{
  subtitles: NormalizedSubtitle[];
  activeIndex: number;
  showAllLangs: boolean;
  locale: Locale;
}>();

defineEmits<{
  (e: 'seek-to', index: number): void;
}>();
</script>

<style scoped lang="scss">
.subtitle-track {
  margin-top: 12px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 6px;
}
</style>
