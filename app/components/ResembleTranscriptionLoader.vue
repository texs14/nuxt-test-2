<template>
  <section class="resemble-loader">
    <div class="resemble-loader__spinner" aria-hidden="true"></div>
    <div class="resemble-loader__info">
      <div class="resemble-loader__text">Обработка транскрибации…</div>
      <div class="resemble-loader__status">{{ viewStatus }}</div>
      <div v-if="error" class="resemble-loader__error">{{ error }}</div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, computed } from 'vue';
import type { SubtitleItem } from '@/types/video.types';
import type { ResembleTranscriptionResponse } from '~~/types/resemble';
import { convertResembleWordsToSubtitles } from '~~/utils/resemble-transcription-adapter';

const props = defineProps<{
  uuid: string;
  intervalMs?: number;
}>();

const emit = defineEmits<{
  (e: 'completed', segments: SubtitleItem[]): void;
  (e: 'status', value: string): void;
  (e: 'error', message: string): void;
}>();

const timer = ref<ReturnType<typeof setInterval> | null>(null);
const status = ref<string>('queued');
const error = ref<string>('');
const viewStatus = computed(() => {
  const statusMap: Record<string, string> = {
    queued: 'в очереди…',
    processing: 'обработка…',
    completed: 'завершено',
    failed: 'ошибка',
  };
  return statusMap[status.value] || status.value || 'ожидание…';
});

async function poll() {
  try {
    const res = await fetch(`/api/resemble/transcription/${encodeURIComponent(props.uuid)}`);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const json = (await res.json()) as ResembleTranscriptionResponse;
    status.value = json.status;
    emit('status', status.value);

    // Если транскрибация завершена
    if (json.status === 'completed') {
      if (json.words && json.words.length > 0) {
        // Преобразуем words в SubtitleItem[] используя утилиту
        const subtitles = convertResembleWordsToSubtitles(json.words);
        clear();
        emit('completed', subtitles);
      } else {
        error.value = 'Транскрибация завершена, но слова отсутствуют';
        emit('error', error.value);
        clear();
      }
      return;
    }

    // Если произошла ошибка
    if (json.status === 'failed') {
      error.value = 'Транскрибация завершилась с ошибкой';
      emit('error', error.value);
      clear();
    }
  } catch (e: any) {
    error.value = e?.message || 'Ошибка опроса статуса Resemble.AI';
    emit('error', error.value);
    clear();
  }
}

function clear() {
  if (timer.value) {
    clearInterval(timer.value);
    timer.value = null;
  }
}

onMounted(() => {
  clear();
  timer.value = setInterval(poll, props.intervalMs ?? 5000);
  void poll();
});

onBeforeUnmount(() => clear());

watch(
  () => props.uuid,
  () => {
    clear();
    if (props.uuid) {
      timer.value = setInterval(poll, props.intervalMs ?? 5000);
      void poll();
    }
  }
);
</script>

<style scoped>
.resemble-loader {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px dashed #e5e7eb;
  border-radius: 10px;
  background: #fafafa;
}

.resemble-loader__spinner {
  width: 18px;
  height: 18px;
  border: 3px solid #dbeafe;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.resemble-loader__info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.resemble-loader__text {
  font-weight: 600;
  color: #1f2937;
}

.resemble-loader__status {
  font-size: 12px;
  color: #374151;
}

.resemble-loader__error {
  color: #b91c1c;
  background: #fef2f2;
  border: 1px solid #fecaca;
  padding: 6px 8px;
  border-radius: 8px;
  font-size: 12px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
