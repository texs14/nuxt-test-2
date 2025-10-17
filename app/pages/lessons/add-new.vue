<template>
  <section class="lesson-upload-form">
    <h1 class="lesson-upload-form__title">
      {{ isEditMode ? t('lessons.addNewPage.titleEdit') : t('lessons.addNewPage.titleCreate') }}
    </h1>

    <p v-if="isEditMode" style="padding: 12px; background: #fef3c7; border-radius: 8px;">
      Режим редактирования (editId: {{ editId }})
    </p>
    <p v-else style="padding: 12px; background: #dbeafe; border-radius: 8px;">
      Режим создания нового урока
    </p>

    <FileUploadWithProgress
      :video-label="t('lessons.addNewPage.videoLabel')"
      :video-hint="t('lessons.addNewPage.autoHint')"
      :subtitles-label="t('lessons.addNewPage.subtitlesLabel')"
      webhook-url="/api/webhook-upload"
      @upload-complete="onUploadComplete"
      @upload-error="onUploadError"
    />

    <MediaPreviewPlayer
      v-if="mediaItem.uploadedVideoUrl.value"
      :src="mediaItem.uploadedVideoUrl.value"
      :subtitles="mediaItem.editorSubtitles.value"
      :lang="selectedLang"
      @metadata="onMeta"
    />

    <ResembleTranscriptionPanel
      v-if="uploadedFiles.audioUrl"
      :audio-url="uploadedFiles.audioUrl"
      @completed="onResembleCompleted"
      @status="(val: string) => (transcriptionStatus = val)"
      @error="(val: string) => (transcriptionError = val)"
      @uuid-changed="(val: string) => (resembleUuid = val)"
    />

    <section class="lesson-upload-form__editor">
      <LessonExerciseEditor v-model="exercises" />
    </section>

    <VideoMetaForm
      class="lesson-upload-form__meta"
      :title="mediaItem.title.value"
      :description="mediaItem.description.value"
      :level="mediaItem.level.value"
      :saving="mediaItem.saving.value"
      :save-error="mediaItem.saveError.value"
      :save-ok="mediaItem.saveOk.value"
      :save-id="mediaItem.saveId.value"
      :can-save="mediaItem.canSave.value"
      @update:title="mediaItem.onUpdateTitle"
      @update:description="mediaItem.onUpdateDescription"
      @update:level="mediaItem.onUpdateLevel"
      @save="saveLesson"
    />
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useHead, useRoute } from '#imports';
import { useI18n } from 'vue-i18n';
import FileUploadWithProgress from '~/components/upload/FileUploadWithProgress.vue';
import MediaPreviewPlayer from '~/components/media/MediaPreviewPlayer.vue';
import ResembleTranscriptionPanel from '~/components/transcription/ResembleTranscriptionPanel.vue';
import { useMediaItem } from '~/composables/shared/useMediaItem';
import type { EditorSubtitleItem } from '~/composables/subtitles/useSubtitleNormalization';
import { normalizeEditorSubtitles } from '~/composables/subtitles/useSubtitleNormalization';

definePageMeta({
  middleware: 'moderator',
});

const { t } = useI18n();
const route = useRoute();

const editId = computed(() => (route.query.editId ? String(route.query.editId) : ''));
const isEditMode = computed(() => !!editId.value);

useHead(() => ({
  title: isEditMode.value ? t('lessons.addNewPage.headEdit') : t('lessons.addNewPage.headCreate'),
}));

const selectedLang = ref<'ru' | 'en' | 'th'>('th');
const resembleUuid = ref<string>('');
const transcriptionStatus = ref<string>('');
const transcriptionError = ref<string>('');

interface ExerciseItem {
  th: string;
  ru: string;
  en: string;
}

const exercises = ref<ExerciseItem[]>([]);

const mediaItem = useMediaItem('lesson');

const uploadedFiles = ref<{ audioUrl?: string }>({});

watch(
  () => editId.value,
  async (val) => {
    if (val) {
      await mediaItem.loadExisting(val);
      exercises.value = (mediaItem.editorSubtitles.value as any).exercises || [];
    }
  },
  { immediate: true }
);

function onUploadComplete(data: any) {
  if (data?.video?.url) mediaItem.setUploadedUrls(data.video.url, data.preview?.url);
  if (data?.audio?.url) uploadedFiles.value.audioUrl = data.audio.url;
  if (data?.resemble?.uuid) resembleUuid.value = String(data.resemble.uuid);
  if (!mediaItem.newId.value) mediaItem.newId.value = mediaItem.genId();
}

function onUploadError(error: string) {
  console.error('Upload error:', error);
}

function onResembleCompleted(segments: any[]) {
  mediaItem.editorSubtitles.value = normalizeEditorSubtitles(segments as any);
}

function onMeta(duration: number) {
  mediaItem.setDuration(duration);
}

async function saveLesson() {
  await mediaItem.saveItem(isEditMode.value, {
    exercises: exercises.value,
  });
}
</script>

<style scoped>
.lesson-upload-form {
  max-width: 1440px;
  margin: 24px auto;
  background: #ffffff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
}

.lesson-upload-form__title {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 16px;
}

.lesson-upload-form__form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.lesson-upload-form__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.lesson-upload-form__label {
  font-weight: 600;
}

.lesson-upload-form__input[type='file'] {
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fafafa;
}

.lesson-upload-form__hint {
  color: #6b7280;
  font-size: 12px;
}

.lesson-upload-form__actions {
  display: flex;
  gap: 12px;
}

.lesson-upload-form__button {
  appearance: none;
  border: none;
  background: #2563eb;
  color: white;
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
}

.lesson-upload-form__button:disabled {
  background: #93c5fd;
  cursor: not-allowed;
}

.lesson-upload-form__progress {
  position: relative;
  height: 12px;
  background: #e5e7eb;
  border-radius: 999px;
  overflow: hidden;
}

.lesson-upload-form__progress-bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 0%;
  background: linear-gradient(90deg, #60a5fa, #2563eb);
  transition: width 0.2s ease;
}

.lesson-upload-form__progress-text {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: #374151;
}

.lesson-upload-form__status {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
}

.lesson-upload-form__status-title {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
}

.lesson-upload-form__status-body {
  margin: 0;
  white-space: pre-wrap;
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
    monospace;
  font-size: 12px;
}

.lesson-upload-form__error {
  color: #b91c1c;
  background: #fef2f2;
  border: 1px solid #fecaca;
  padding: 10px;
  border-radius: 8px;
}

.lesson-upload-form__subtitle {
  font-size: 18px;
  margin: 16px 0 8px;
}

.lesson-upload-form__preview {
  margin-top: 12px;
}

.lesson-upload-form__player {
  margin-top: 8px;
}

.lesson-upload-form__editor {
  margin-top: 16px;
}

.lesson-upload-form__meta {
  margin-top: 16px;
}

.lesson-upload-form__lang {
  display: flex;
  gap: 8px;
  align-items: center;
}

.lesson-upload-form__loader {
  margin-top: 16px;
}
</style>
