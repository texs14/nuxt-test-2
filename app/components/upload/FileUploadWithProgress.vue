<template>
  <form class="file-upload" @submit.prevent="handleSubmit">
    <div class="file-upload__field">
      <label class="file-upload__label" :for="videoInputId">
        {{ videoLabel }}
      </label>
      <input
        :id="videoInputId"
        class="file-upload__input"
        type="file"
        name="video"
        :accept="videoAccept"
        :disabled="isUploading"
        required
        @change="onVideoChange"
      />
      <p v-if="videoName" class="file-upload__hint">
        {{ t('videos.addNew.selected', { name: videoName }) }}
      </p>
      <p v-if="videoHint" class="file-upload__hint">{{ videoHint }}</p>
    </div>

    <div v-if="showSubtitles" class="file-upload__field">
      <label class="file-upload__label" :for="subtitlesInputId">
        {{ subtitlesLabel }}
      </label>
      <input
        :id="subtitlesInputId"
        class="file-upload__input"
        type="file"
        name="subtitles"
        :accept="subtitlesAccept"
        :disabled="isUploading"
        @change="onSubtitlesChange"
      />
      <p v-if="subsName" class="file-upload__hint">
        {{ t('videos.addNew.selected', { name: subsName }) }}
      </p>
    </div>

    <div class="file-upload__actions">
      <button
        class="file-upload__button"
        type="submit"
        :disabled="!videoFile || isUploading"
      >
        {{ uploadButtonText }}
      </button>
    </div>

    <div v-if="isUploading" class="file-upload__progress">
      <div class="file-upload__progress-bar" :style="{ width: uploadProgress + '%' }"></div>
      <span class="file-upload__progress-text">{{ Math.floor(uploadProgress) }}%</span>
    </div>

    <p v-if="errorMessage" class="file-upload__error">{{ errorMessage }}</p>
  </form>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useFileUpload } from '~/composables/upload/useFileUpload';

interface Props {
  videoLabel?: string;
  videoHint?: string;
  videoAccept?: string;
  subtitlesLabel?: string;
  subtitlesAccept?: string;
  showSubtitles?: boolean;
  webhookUrl?: string;
  videoInputId?: string;
  subtitlesInputId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  videoAccept: 'video/*',
  subtitlesAccept: '.srt,.vtt',
  showSubtitles: true,
  videoInputId: 'video',
  subtitlesInputId: 'subtitles',
});

interface Emits {
  (e: 'upload-complete', data: any): void;
  (e: 'upload-error', error: string): void;
  (e: 'video-change', file: File | null): void;
  (e: 'subtitles-change', file: File | null): void;
}

const emit = defineEmits<Emits>();

const { t } = useI18n();

const {
  videoFile,
  subtitlesFile,
  isUploading,
  uploadProgress,
  errorMessage,
  videoName,
  subsName,
  setVideoFile,
  setSubtitlesFile,
  uploadNow,
} = useFileUpload({
  webhookUrl: props.webhookUrl,
  onSuccess: (data) => emit('upload-complete', data),
  onError: (error) => emit('upload-error', error),
});

const uploadButtonText = computed(() =>
  isUploading.value ? t('videos.addNew.submitUploading') : t('videos.addNew.submitAgain')
);

function onVideoChange(e: Event) {
  const files = (e.target as HTMLInputElement).files;
  const file = files && files[0] ? files[0] : null;
  setVideoFile(file);
  emit('video-change', file);
  if (file) {
    void uploadNow();
  }
}

function onSubtitlesChange(e: Event) {
  const files = (e.target as HTMLInputElement).files;
  const file = files && files[0] ? files[0] : null;
  setSubtitlesFile(file);
  emit('subtitles-change', file);
}

async function handleSubmit() {
  if (!videoFile.value) return;
  await uploadNow();
}
</script>

<style scoped>
.file-upload {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.file-upload__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-upload__label {
  font-weight: 600;
}

.file-upload__input[type='file'] {
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fafafa;
}

.file-upload__hint {
  color: #6b7280;
  font-size: 12px;
}

.file-upload__actions {
  display: flex;
  gap: 12px;
}

.file-upload__button {
  appearance: none;
  border: none;
  background: #2563eb;
  color: white;
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
}

.file-upload__button:disabled {
  background: #93c5fd;
  cursor: not-allowed;
}

.file-upload__progress {
  position: relative;
  height: 12px;
  background: #e5e7eb;
  border-radius: 999px;
  overflow: hidden;
}

.file-upload__progress-bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 0%;
  background: linear-gradient(90deg, #60a5fa, #2563eb);
  transition: width 0.2s ease;
}

.file-upload__progress-text {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: #374151;
}

.file-upload__error {
  color: #b91c1c;
  background: #fef2f2;
  border: 1px solid #fecaca;
  padding: 10px;
  border-radius: 8px;
}
</style>
