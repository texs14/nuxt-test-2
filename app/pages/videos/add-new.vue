<template>
  <section class="video-upload-form">
    <h1 class="video-upload-form__title">
      {{ isEditMode ? t('videos.addNew.titleEdit') : t('videos.addNew.titleCreate') }}
    </h1>

    <p v-if="isEditMode" style="padding: 12px; background: #fef3c7; border-radius: 8px">
      Режим редактирования (editId: {{ editId }})
    </p>
    <p v-else style="padding: 12px; background: #dbeafe; border-radius: 8px">
      Режим создания нового видео
    </p>

    <FileUploadWithProgress
      :video-label="t('videos.addNew.videoLabel')"
      :video-hint="t('videos.addNew.autoHint')"
      :subtitles-label="t('videos.addNew.subtitlesLabel')"
      webhook-url="/api/webhook-upload"
      @upload-complete="onUploadComplete"
      @upload-error="onUploadError"
    />

    <MediaPreviewPlayer
      v-if="mediaItem.uploadedVideoUrl.value"
      :src="mediaItem.uploadedVideoUrl.value"
      :subtitles="mediaItem.editorSubtitles.value"
      :lang="selectedLang"
      @update:lang="(val: any) => (selectedLang = val)"
      @metadata="mediaItem.setDuration"
    />

    <ResembleTranscriptionPanel
      v-if="uploadedFiles.audioUrl"
      :audio-url="uploadedFiles.audioUrl"
      show-mock-button
      @completed="onResembleCompleted"
      @status="(val: string) => (transcriptionStatus = val)"
      @error="(val: string) => (transcriptionError = val)"
      @uuid-changed="(val: string) => (resembleUuid = val)"
    />

    <section class="video-upload-form__editor">
      <SubtitleEditor v-model="mediaItem.editorSubtitles.value" />
    </section>

    <VideoMetaForm
      class="video-upload-form__meta"
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
      @save="saveVideo"
    />

    <section
      v-if="isAdmin && mediaItem.newId.value && mediaItem.status.value === 'moderation'"
      class="video-upload-form__approve"
    >
      <button
        class="video-upload-form__button video-upload-form__button_success"
        type="button"
        :disabled="approving"
        @click="approveVideo"
      >
        {{ approving ? t('videos.addNew.approving') : t('videos.addNew.approve') }}
      </button>
      <p v-if="approveError" class="video-upload-form__error">{{ approveError }}</p>
      <p v-if="approveSuccess" class="video-upload-form__success">
        {{ t('videos.addNew.approveSuccess') }}
      </p>
    </section>
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
import { normalizeEditorSubtitles } from '~/composables/subtitles/useSubtitleNormalization';

definePageMeta({
  middleware: 'moderator',
});

const { t } = useI18n();
const route = useRoute();

const selectedLang = ref<'ru' | 'en' | 'th'>('th');
const resembleUuid = ref<string>('');
const transcriptionStatus = ref<string>('');
const transcriptionError = ref<string>('');
const approving = ref(false);
const approveError = ref('');
const approveSuccess = ref(false);

const editId = computed(() => (route.query.editId ? String(route.query.editId) : ''));
const isEditMode = computed(() => !!editId.value);

useHead(() => ({
  title: isEditMode.value ? t('videos.addNew.headEdit') : t('videos.addNew.headCreate'),
}));

const mediaItem = useMediaItem('video');

const uploadedFiles = ref<{ audioUrl?: string }>({});

const { isAdmin } = useUserRole();

watch(
  () => editId.value,
  async (val) => {
    if (val) {
      await mediaItem.loadExisting(val);
    }
  },
  { immediate: true }
);

async function onUploadComplete(data: any) {
  if (data?.video?.url) mediaItem.setUploadedUrls(data.video.url, data.preview?.url);
  if (data?.audio?.url) uploadedFiles.value.audioUrl = data.audio.url;
  if (data?.resemble?.uuid) resembleUuid.value = String(data.resemble.uuid);

  if (mediaItem.uploadedVideoUrl.value && !isEditMode.value) {
    await createVideoRecord();
  }
}

function onUploadError(error: string) {
  console.error('Upload error:', error);
}

function onResembleCompleted(segments: any[]) {
  mediaItem.editorSubtitles.value = normalizeEditorSubtitles(segments as any);
}

async function createVideoRecord() {
  if (!mediaItem.uploadedVideoUrl.value || mediaItem.newId.value) return;

  try {
    await mediaItem.createItem();
  } catch (e: any) {
    console.error('Create video error:', e);
  }
}

async function saveVideo() {
  await mediaItem.saveItem(isEditMode.value);
}

async function approveVideo() {
  if (!mediaItem.newId.value || approving.value) return;

  approving.value = true;
  approveError.value = '';
  approveSuccess.value = false;

  try {
    const res = await fetch(
      `/api/video-items/${encodeURIComponent(String(mediaItem.newId.value))}/approve`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || 'Ошибка одобрения видео');

    mediaItem.status.value = 'approved';
    approveSuccess.value = true;
  } catch (e: any) {
    approveError.value = e?.message || 'Ошибка одобрения видео';
  } finally {
    approving.value = false;
  }
}
</script>

<style scoped>
.video-upload-form {
  max-width: 1440px;
  margin: 24px auto;
  background: #ffffff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
}

.video-upload-form__title {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 16px;
}

.video-upload-form__editor {
  margin-top: 16px;
}

.video-upload-form__meta {
  margin-top: 16px;
}

.video-upload-form__approve {
  margin-top: 16px;
}

.video-upload-form__button {
  appearance: none;
  border: none;
  background: #2563eb;
  color: white;
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
}

.video-upload-form__button:disabled {
  background: #93c5fd;
  cursor: not-allowed;
}

.video-upload-form__button_success {
  background: #10b981;
}

.video-upload-form__button_success:hover:not(:disabled) {
  background: #059669;
}

.video-upload-form__error {
  color: #b91c1c;
  background: #fef2f2;
  border: 1px solid #fecaca;
  padding: 10px;
  border-radius: 8px;
  margin-top: 12px;
}

.video-upload-form__success {
  color: #065f46;
  background: #d1fae5;
  border: 1px solid #6ee7b7;
  padding: 10px;
  border-radius: 8px;
  margin-top: 12px;
}
</style>
