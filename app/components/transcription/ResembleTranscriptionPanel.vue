<template>
  <section class="transcription-panel">
    <div v-if="audioUrl" class="transcription-panel__actions">
      <button
        class="transcription-panel__button"
        type="button"
        :disabled="loading"
        @click="startTranscription"
      >
        {{ loading ? t('videos.addNew.transcribeInProgress') : t('videos.addNew.transcribeStart') }}
      </button>

      <button
        v-if="showMockButton"
        class="transcription-panel__button"
        type="button"
        :disabled="mockLoading"
        @click="loadMockTranscription"
      >
        {{
          mockLoading
            ? t('videos.addNew.transcribeMockInProgress')
            : t('videos.addNew.transcribeMockLoad')
        }}
      </button>
    </div>

    <p v-if="error" class="transcription-panel__error">{{ error }}</p>

    <ResembleTranscriptionLoader
      v-if="uuid"
      class="transcription-panel__loader"
      :uuid="uuid"
      @completed="onCompleted"
      @status="onStatus"
      @error="onError"
    />
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import ResembleTranscriptionLoader from '~/components/ResembleTranscriptionLoader.vue';
import type { ResembleTranscriptionResponse } from '~~/types/resemble';
import { convertResembleWordsToSubtitles } from '~~/utils/resemble-transcription-adapter';

interface Props {
  audioUrl?: string;
  showMockButton?: boolean;
  mockTranscriptionUrl?: string;
}

const props = withDefaults(defineProps<Props>(), {
  showMockButton: false,
  mockTranscriptionUrl: '/transcript-ef2e6cda-bb00-493c-9e0d-a1c36362e96d.json',
});

interface Emits {
  (e: 'completed', segments: any[]): void;
  (e: 'status', status: string): void;
  (e: 'error', error: string): void;
  (e: 'uuid-changed', uuid: string): void;
}

const emit = defineEmits<Emits>();

const { t } = useI18n();

const uuid = ref<string>('');
const loading = ref(false);
const mockLoading = ref(false);
const error = ref<string>('');

async function startTranscription() {
  if (!props.audioUrl || loading.value) return;

  error.value = '';
  uuid.value = '';
  loading.value = true;

  try {
    const res = await fetch('/api/resemble/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio_url: props.audioUrl }),
    });

    if (!res.ok) {
      const message = await res.text().catch(() => '');
      throw new Error(message || 'Не удалось запустить транскрибацию');
    }

    const data = (await res.json()) as any;
    const newUuid = data?.uuid ? String(data.uuid) : '';

    if (!newUuid) {
      throw new Error('Resemble.AI не вернул идентификатор транскрибации');
    }

    uuid.value = newUuid;
    emit('uuid-changed', newUuid);
    emit('status', data?.status ? String(data.status) : '');
  } catch (err: any) {
    const errorMsg = err?.message || 'Ошибка запуска транскрибации';
    error.value = errorMsg;
    emit('error', errorMsg);
  } finally {
    loading.value = false;
  }
}

async function loadMockTranscription() {
  if (mockLoading.value || !props.mockTranscriptionUrl) return;

  error.value = '';
  mockLoading.value = true;

  try {
    const response = await fetch(props.mockTranscriptionUrl);

    if (!response.ok) {
      throw new Error(`Не удалось загрузить моковый файл: HTTP ${response.status}`);
    }

    const payload = (await response.json()) as ResembleTranscriptionResponse;

    if (!payload?.words || payload.words.length === 0) {
      throw new Error('Моковые данные не содержат слов для транскрибации');
    }

    uuid.value = payload.uuid || '';
    emit('uuid-changed', uuid.value);
    emit('status', payload.status || 'completed');

    const subtitles = convertResembleWordsToSubtitles(payload.words);
    emit('completed', subtitles as unknown as any[]);
  } catch (err: any) {
    const errorMsg = err?.message || 'Ошибка загрузки моковой транскрибации';
    error.value = errorMsg;
    emit('error', errorMsg);
  } finally {
    mockLoading.value = false;
  }
}

function onCompleted(segments: any[]) {
  emit('completed', segments);
}

function onStatus(status: string) {
  emit('status', status);
}

function onError(errorMsg: string) {
  error.value = errorMsg;
  emit('error', errorMsg);
}

defineExpose({
  startTranscription,
  loadMockTranscription,
});
</script>

<style scoped>
.transcription-panel {
  margin-top: 16px;
}

.transcription-panel__actions {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.transcription-panel__button {
  appearance: none;
  border: none;
  background: #2563eb;
  color: white;
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
}

.transcription-panel__button:disabled {
  background: #93c5fd;
  cursor: not-allowed;
}

.transcription-panel__error {
  color: #b91c1c;
  background: #fef2f2;
  border: 1px solid #fecaca;
  padding: 10px;
  border-radius: 8px;
  margin-top: 12px;
}

.transcription-panel__loader {
  margin-top: 16px;
}
</style>
