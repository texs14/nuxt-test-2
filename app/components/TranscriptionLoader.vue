<template>
  <section class="tg-loader">
    <div class="tg-loader__spinner" aria-hidden="true"></div>
    <div class="tg-loader__info">
      <div class="tg-loader__text">Обработка аудио…</div>
      <div class="tg-loader__status">{{ viewStatus }}</div>
      <div v-if="error" class="tg-loader__error">{{ error }}</div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, computed } from 'vue'

interface RawSegment {
  start_time?: string
  end_time?: string
  start?: string
  end?: string
  text?: string
  corrected_text?: string
}

interface SubtitleText { th?: string; ru?: string; en?: string }
interface SubtitleItem { id?: number|string; start: number; end: number; text?: SubtitleText | string }

const props = defineProps<{ jobId: string; intervalMs?: number }>()
const emit = defineEmits<{
  (e: 'completed', segments: SubtitleItem[]): void
  (e: 'status', value: string): void
  (e: 'error', message: string): void
}>()

const timer = ref<any>(null)
const status = ref<string>('queued')
const error = ref<string>('')
const viewStatus = computed(() => status.value || 'ожидание…')

function hhmmssToSec(s?: string): number {
  if (!s) return 0
  const parts = s.split(':').map(Number)
  if (parts.length === 3) {
    const [hh = 0, mm = 0, ss = 0] = parts
    return hh * 3600 + mm * 60 + ss
  }
  if (parts.length === 2) {
    const [mm = 0, ss = 0] = parts
    return mm * 60 + ss
  }
  return Number(s) || 0
}

function sanitizeThaiSpacing(text: string): string {
  if (!text) return ''
  // Удаляем пробелы только между тайскими символами
  let out = text
  const re = /([\u0E00-\u0E7F])\s+([\u0E00-\u0E7F])/g
  for (let i = 0; i < 5; i++) {
    const next = out.replace(re, '$1$2')
    if (next === out) break
    out = next
  }
  return out
}

function normalizeSegments(arr: RawSegment[]): SubtitleItem[] {
  return (arr || []).map((r, i) => ({
    id: i + 1,
    start: hhmmssToSec(r.start_time || r.start),
    end: hhmmssToSec(r.end_time || r.end),
    text: { th: sanitizeThaiSpacing(r.text || r.text || '') }
  }))
}

async function poll() {
  if (!props.jobId) return
  try {
    const res = await fetch(`/api/transgate/${encodeURIComponent(props.jobId)}`)
    const json = await res.json()
    const st = json?.job?.status || json?.status || ''
    status.value = st
    emit('status', status.value)

    const results = json?.result || json?.results || json?.segments
    if (Array.isArray(results) && results.length) {
      const segments = normalizeSegments(results)
      clear()
      emit('completed', segments)
      return
    }

    if (status.value === 'completed') {
      const segments = normalizeSegments(results || [])
      clear()
      emit('completed', segments)
      return
    }
  } catch (e: any) {
    error.value = e?.message || 'Ошибка опроса Transgate'
    emit('error', error.value)
  }
}

function clear() {
  if (timer.value) {
    clearInterval(timer.value)
    timer.value = null
  }
}

onMounted(() => {
  clear()
  timer.value = setInterval(poll, props.intervalMs ?? 6000)
  void poll()
})

onBeforeUnmount(() => clear())

watch(() => props.jobId, () => {
  clear()
  if (props.jobId) {
    timer.value = setInterval(poll, props.intervalMs ?? 6000)
    void poll()
  }
})
</script>

<style scoped>
.tg-loader { display: flex; align-items: center; gap: 12px; padding: 12px; border: 1px dashed #e5e7eb; border-radius: 10px; background: #fafafa; }
.tg-loader__spinner { width: 18px; height: 18px; border: 3px solid #dbeafe; border-top-color: #2563eb; border-radius: 50%; animation: spin 1s linear infinite; }
.tg-loader__info { display: flex; flex-direction: column; gap: 4px; }
.tg-loader__text { font-weight: 600; color: #1f2937; }
.tg-loader__status { font-size: 12px; color: #374151; }
.tg-loader__error { color: #b91c1c; background: #fef2f2; border: 1px solid #fecaca; padding: 6px 8px; border-radius: 8px; font-size: 12px; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
