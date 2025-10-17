<template>
  <section v-if="src" class="media-preview">
    <h2 v-if="showTitle" class="media-preview__title">{{ title || t('videos.addNew.preview') }}</h2>

    <div v-if="showLangSelector" class="media-preview__lang">
      <label class="media-preview__label">{{ t('videos.addNew.subtitleLang') }}</label>
      <select v-model="selectedLangModel" class="media-preview__select">
        <option value="th">{{ t('lang.thai') }}</option>
        <option value="ru">{{ t('lang.russian') }}</option>
        <option value="en">{{ t('lang.english') }}</option>
      </select>
    </div>

    <VideoPlayer
      :key="src"
      class="media-preview__player"
      :src="src"
      :subtitles="subtitles"
      :lang="selectedLangModel"
      :show-all-langs="showAllLangs"
    />

    <!-- Hidden video element for metadata extraction -->
    <video
      v-if="extractMetadata"
      :key="src + '-meta'"
      :src="src"
      style="display: none"
      @loadedmetadata="onMetadata"
    />
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';

interface Props {
  src?: string;
  subtitles?: any[];
  lang?: 'ru' | 'en' | 'th';
  showAllLangs?: boolean;
  showTitle?: boolean;
  title?: string;
  showLangSelector?: boolean;
  extractMetadata?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  lang: 'th',
  showAllLangs: true,
  showTitle: false,
  showLangSelector: true,
  extractMetadata: true,
});

interface Emits {
  (e: 'update:lang', lang: 'ru' | 'en' | 'th'): void;
  (e: 'metadata', duration: number): void;
}

const emit = defineEmits<Emits>();

const { t } = useI18n();

const selectedLangModel = computed({
  get: () => props.lang,
  set: (value) => emit('update:lang', value),
});

function onMetadata(e: Event) {
  const el = e.target as HTMLVideoElement;
  if (el && isFinite(el.duration)) {
    const duration = Math.floor(el.duration);
    emit('metadata', duration);
  }
}
</script>

<style scoped>
.media-preview {
  margin-top: 12px;
}

.media-preview__title {
  font-size: 18px;
  margin: 16px 0 8px;
}

.media-preview__lang {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.media-preview__label {
  font-weight: 600;
}

.media-preview__select {
  padding: 6px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fafafa;
}

.media-preview__player {
  margin-top: 8px;
}
</style>
