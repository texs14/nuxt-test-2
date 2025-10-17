<template>
  <section class="video-upload-form">
    <h1 class="video-upload-form__title">
      {{ isEditMode ? t('videos.addNew.titleEdit') : t('videos.addNew.titleCreate') }}
    </h1>

    <form v-if="!isEditMode" class="video-upload-form__form" @submit.prevent="handleSubmit">
      <div class="video-upload-form__field">
        <label class="video-upload-form__label" for="video">
          {{ t('videos.addNew.videoLabel') }}
        </label>
        <input
          id="video"
          class="video-upload-form__input"
          type="file"
          name="video"
          accept="video/*"
          :disabled="isUploading"
          required
          @change="onVideoChange"
        />
        <p v-if="videoName" class="video-upload-form__hint">
          {{ t('videos.addNew.selected', { name: videoName }) }}
        </p>
        <p class="video-upload-form__hint">
          {{ t('videos.addNew.autoHint') }}
        </p>
      </div>

      <div class="video-upload-form__field">
        <label class="video-upload-form__label" for="subtitles">
          {{ t('videos.addNew.subtitlesLabel') }}
        </label>
        <input
          id="subtitles"
          class="video-upload-form__input"
          type="file"
          name="subtitles"
          accept=".srt,.vtt"
          :disabled="isUploading"
          @change="onSubtitlesChange"
        />
        <p v-if="subsName" class="video-upload-form__hint">
          {{ t('videos.addNew.selected', { name: subsName }) }}
        </p>
      </div>

      <div class="video-upload-form__actions">
        <button
          class="video-upload-form__button"
          type="submit"
          :disabled="!videoFile || isUploading"
        >
          {{ uploadButtonText }}
        </button>
      </div>

      <div v-if="isUploading" class="video-upload-form__progress">
        <div class="video-upload-form__progress-bar" :style="{ width: uploadProgress + '%' }"></div>
        <span class="video-upload-form__progress-text">{{ Math.floor(uploadProgress) }}%</span>
      </div>

      <div v-if="serverMessage" class="video-upload-form__status">
        <h2 class="video-upload-form__status-title">{{ t('videos.addNew.serverResponse') }}</h2>
        <pre class="video-upload-form__status-body">{{ serverMessage }}</pre>
      </div>

      <p v-if="errorMessage" class="video-upload-form__error">{{ errorMessage }}</p>
    </form>

    <section v-if="uploadedVideoUrl" class="video-upload-form__preview">
      <h2 class="video-upload-form__subtitle">{{ t('videos.addNew.preview') }}</h2>

      <div class="video-upload-form__lang">
        <label class="video-upload-form__label">{{ t('videos.addNew.subtitleLang') }}</label>
        <select v-model="selectedLang" class="video-upload-form__input">
          <option value="th">{{ t('lang.thai') }}</option>
          <option value="ru">{{ t('lang.russian') }}</option>
          <option value="en">{{ t('lang.english') }}</option>
        </select>
      </div>

      <VideoPlayer
        :key="uploadedVideoUrl"
        class="video-upload-form__player"
        :src="uploadedVideoUrl"
        :subtitles="editorSubtitles"
        :lang="selectedLang"
        :show-all-langs="true"
      />
    </section>

    <!-- скрытый видеотег для вычисления длительности -->
    <video
      v-if="uploadedVideoUrl"
      :key="uploadedVideoUrl + '-meta'"
      :src="uploadedVideoUrl"
      style="display: none"
      @loadedmetadata="onMeta"
    />

    <ResembleTranscriptionLoader
      v-if="resembleUuid"
      class="video-upload-form__loader"
      :uuid="resembleUuid"
      @completed="onResembleCompleted"
      @status="(val: string) => (transcriptionStatus = val)"
      @error="(val: string) => (transcriptionError = val)"
    />

    <section class="video-upload-form__editor">
      <SubtitleEditor v-model="editorSubtitles" />
    </section>

    <VideoMetaForm
      class="video-upload-form__meta"
      :title="title"
      :description="description"
      :level="level"
      :saving="saving"
      :save-error="saveError"
      :save-ok="saveOk"
      :save-id="saveId"
      :can-save="!!uploadedVideoUrl"
      @update:title="onUpdateTitle"
      @update:description="onUpdateDescription"
      @update:level="onUpdateLevel"
      @save="saveVideo"
    />
  </section>
</template>
<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useHead, useRoute, useSupabaseClient } from '#imports';
import { useI18n } from 'vue-i18n';
import type {
  SubtitleItem as RawSubtitleItem,
  SubtitleText as RawSubtitleText,
  ThaiSentences,
} from '@/types/video.types';

definePageMeta({
  middleware: 'moderator',
});

const WEBHOOK_URL = '/api/webhook-upload';

const { t } = useI18n();

const videoFile = ref<File | null>(null);
const subtitlesFile = ref<File | null>(null);
const isUploading = ref(false);
const uploadProgress = ref(0);
const serverMessage = ref('');
const errorMessage = ref('');

const videoName = computed(() => videoFile.value?.name ?? '');
const subsName = computed(() => subtitlesFile.value?.name ?? '');

type EditorSubtitleText = { th?: string; en?: string; ru?: string };
type LocaleText = { th?: string; ru?: string; en?: string };
type EditorSubtitleItem = {
  id?: number | string;
  start: number;
  end: number;
  text?: EditorSubtitleText | string;
};

const selectedLang = ref<'ru' | 'en' | 'th'>('th');
const route = useRoute();
const supabase = useSupabaseClient();
const editId = computed(() => (route.query.editId ? String(route.query.editId) : ''));
const isEditMode = computed(() => !!editId.value);
useHead(() => ({
  title: isEditMode.value ? t('videos.addNew.headEdit') : t('videos.addNew.headCreate'),
}));
const uploadedVideoUrl = ref<string>('');
const uploadedAudioUrl = ref<string>('');
const uploadedPreviewUrl = ref<string>('');
const resembleUuid = ref<string>('');
const transcriptionStatus = ref<string>('');
const transcriptionError = ref<string>('');

const editorSubtitles = ref<EditorSubtitleItem[]>([]);

function segmentThaiWords(text: string): string[] {
  const normalized = text.replace(/\s+/gu, ' ').trim();
  if (!normalized) return [];
  const bySpace = normalized.split(' ').filter(Boolean);
  if (bySpace.length > 1) return bySpace;
  return [normalized];
}

function flattenThaiSentences(value: ThaiSentences | undefined): string {
  if (!value || !Array.isArray(value.sentences)) return '';
  return value.sentences
    .map((sentence) =>
      sentence
        .map((word) => word.trim())
        .filter(Boolean)
        .join(' ')
    )
    .filter((sentence) => sentence.length > 0)
    .join('   ');
}
function prepareThaiEditorValue(value: string | ThaiSentences | undefined): string {
  if (!value) return '';
  if (typeof value === 'object') return flattenThaiSentences(value);
  return segmentThaiWords(value).join(' ');
}

function normalizeEditorSubtitles(items: RawSubtitleItem[]): EditorSubtitleItem[] {
  return items.map((item, index) => {
    const baseText =
      typeof item.text === 'string'
        ? ({ ru: item.text } as RawSubtitleText)
        : ({ ...(item.text ?? {}) } as RawSubtitleText);

    const thaiSource = (() => {
      const th = baseText.th;
      if (!th) return undefined;
      if (typeof th === 'string') return th;
      if (typeof th === 'object') return th as ThaiSentences;
      return undefined;
    })();

    return {
      id: item.id ?? index + 1,
      start: Number(item.start ?? 0),
      end: Number(item.end ?? 0),
      text: {
        th: prepareThaiEditorValue(thaiSource),
        ru: baseText.ru ? normalizeLocaleField(baseText.ru) : '',
        en: baseText.en ? normalizeLocaleField(baseText.en) : '',
      },
    };
  });
}

function buildThaiSentencesPayload(value: string | ThaiSentences | undefined): ThaiSentences {
  if (!value) return { sentences: [] };
  if (typeof value === 'object') {
    return {
      sentences: (value.sentences ?? [])
        .map((sentence) => sentence.map((word) => word.trim()).filter(Boolean))
        .filter((sentence) => sentence.length > 0),
    };
  }
  const normalized = value
    .replace(/\r?\n/gu, ' ')
    .replace(/\u00A0/gu, ' ')
    .trim();
  if (!normalized) return { sentences: [] };
  const rawSentences = normalized
    .split(/(?:\s{3,}|\.)\s*/gu)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const sentences = rawSentences
    .map((sentence) => {
      if (sentence.includes(' ')) {
        return sentence
          .split(/\s+/gu)
          .map((word) => word.trim())
          .filter(Boolean);
      }
      return [sentence];
    })
    .filter((words) => words.length > 0);
  return { sentences };
}

function buildSubtitlesPayload(items: EditorSubtitleItem[]): RawSubtitleItem[] {
  return items.map((item, index) => {
    const text: EditorSubtitleText =
      typeof item.text === 'string' ? { ru: item.text } : { ...(item.text ?? {}) };
    const thaiSource = (() => {
      const th = text.th;
      if (!th) return undefined;
      if (typeof th === 'string') return th;
      if (typeof th === 'object') return th as ThaiSentences;
      return undefined;
    })();

    return {
      id: item.id ?? index + 1,
      start: Number(item.start ?? 0),
      end: Number(item.end ?? 0),
      text: {
        ...text,
        th: buildThaiSentencesPayload(thaiSource),
      } as RawSubtitleText,
    };
  });
}

function normalizeLocaleField(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'sentences' in value) {
    return prepareThaiEditorValue(value as ThaiSentences);
  }
  return String(value ?? '');
}

function normalizeLocaleText(value: unknown): LocaleText {
  if (!value) return { th: '', ru: '', en: '' };
  if (typeof value === 'string') {
    const str = String(value);
    return { th: '', ru: str, en: '' };
  }
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<'th' | 'ru' | 'en', unknown>;
    return {
      th: obj.th ? normalizeLocaleField(obj.th) : '',
      ru: obj.ru ? normalizeLocaleField(obj.ru) : '',
      en: obj.en ? normalizeLocaleField(obj.en) : '',
    };
  }
  return { th: '', ru: String(value ?? ''), en: '' };
}

const title = ref<LocaleText>({ th: '', ru: '', en: '' });
const description = ref<LocaleText>({ th: '', ru: '', en: '' });
const level = ref<string>('A1');
const durationSeconds = ref<number>(0);
const newId = ref<string>('');

const saving = ref(false);
const saveOk = ref(false);
const saveError = ref('');
const saveId = ref<string | number>('');

const loadingExisting = ref(false);
const loadError = ref('');

const uploadButtonText = computed(() =>
  isUploading.value ? t('videos.addNew.submitUploading') : t('videos.addNew.submitAgain')
);

async function loadExisting() {
  if (!isEditMode.value || loadingExisting.value) return;
  loadingExisting.value = true;
  loadError.value = '';
  try {
    const res = await supabase
      .from('video_items')
      .select('id, title, description, level, video_url, preview_url, duration, subtitles')
      .eq('id', editId.value)
      .maybeSingle();
    if (res.error) throw res.error;
    const data = res.data as any;
    if (data) {
      newId.value = String(data.id);
      uploadedVideoUrl.value = String(data.video_url || '');
      uploadedPreviewUrl.value = String(data.preview_url || '');
      const d = data.duration as any;
      durationSeconds.value = Number(d?.seconds ?? 0);
      editorSubtitles.value = normalizeEditorSubtitles((data.subtitles as any[]) || []);
      // заголовки/описания/уровень
      const t = data.title;
      title.value = normalizeLocaleText(t);
      const desc = data.description;
      description.value = normalizeLocaleText(desc);
      level.value = String(data.level || 'A1');
    }
  } catch (e: any) {
    loadError.value = e?.message || t('videos.addNew.loadError');
  } finally {
    loadingExisting.value = false;
  }
}

watch(
  () => editId.value,
  async (val) => {
    if (val) await loadExisting();
  },
  { immediate: true }
);

function onVideoChange(e: Event) {
  const files = (e.target as HTMLInputElement).files;
  videoFile.value = files && files[0] ? files[0] : null;
  serverMessage.value = '';
  errorMessage.value = '';
  if (videoFile.value) {
    void uploadNow();
  }
}

function onSubtitlesChange(e: Event) {
  const files = (e.target as HTMLInputElement).files;
  subtitlesFile.value = files && files[0] ? files[0] : null;
}

async function handleSubmit() {
  if (!videoFile.value) return;
  await uploadNow();
}

function buildFormData(): FormData {
  const fd = new FormData();
  if (videoFile.value) fd.append('video', videoFile.value, videoFile.value.name);
  if (subtitlesFile.value) fd.append('subtitles', subtitlesFile.value, subtitlesFile.value.name);
  return fd;
}

function uploadWithProgress(formData: FormData): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', WEBHOOK_URL, true);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        uploadProgress.value = (e.loaded / e.total) * 100;
      }
    };

    xhr.onreadystatechange = () => {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        try {
          const contentType = xhr.getResponseHeader('Content-Type') || '';
          if (contentType.includes('application/json')) {
            resolve(JSON.stringify(JSON.parse(xhr.responseText), null, 2));
          } else {
            resolve(xhr.responseText);
          }
        } catch (err) {
          resolve(xhr.responseText);
        } finally {
          isUploading.value = false;
          uploadProgress.value = 100;
        }
      }
    };

    xhr.onerror = () => {
      isUploading.value = false;
      reject(new Error(t('videos.addNew.networkError')));
    };

    isUploading.value = true;
    uploadProgress.value = 0;
    xhr.send(formData);
  });
}

async function uploadNow() {
  errorMessage.value = '';
  serverMessage.value = '';
  try {
    const fd = buildFormData();
    const respText = await uploadWithProgress(fd);
    serverMessage.value = respText || t('videos.addNew.emptyResponse');
    try {
      const data = JSON.parse(respText);
      if (data?.video?.url) uploadedVideoUrl.value = data.video.url;
      if (data?.audio?.url) uploadedAudioUrl.value = data.audio.url;
      if (data?.preview?.url) uploadedPreviewUrl.value = data.preview.url;
      if (data?.resemble?.uuid) {
        resembleUuid.value = String(data.resemble.uuid);
      }
      if (!newId.value) newId.value = genId();
    } catch {}
  } catch (e: any) {
    errorMessage.value = e?.message || t('videos.addNew.uploadError');
  } finally {
    isUploading.value = false;
  }
}

function onResembleCompleted(segments: RawSubtitleItem[]) {
  editorSubtitles.value = normalizeEditorSubtitles(segments);
}

function onMeta(e: Event) {
  const el = e.target as HTMLVideoElement;
  if (el && isFinite(el.duration)) durationSeconds.value = Math.floor(el.duration);
}

function genId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return 'vid_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

function onUpdateTitle(v: LocaleText) {
  title.value = v;
}
function onUpdateDescription(v: LocaleText) {
  description.value = v;
}
function onUpdateLevel(v: string) {
  level.value = v;
}

async function saveVideo() {
  saveError.value = '';
  saveOk.value = false;
  saving.value = true;
  try {
    if (isEditMode.value) {
      if (!newId.value) throw new Error(t('videos.addNew.missingId'));
      const payload = {
        // Разрешаем редактировать субтитры и мету при необходимости
        subtitles: buildSubtitlesPayload(editorSubtitles.value),
        title: title.value,
        description: description.value,
        level: level.value,
      };
      const res = await fetch(`/api/video-items/${encodeURIComponent(String(newId.value))}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `Update failed (${res.status})`);
      saveOk.value = true;
      saveId.value = json?.id || newId.value;
      // Обновляем локальное состояние из БД, чтобы сразу отобразить нормализованные данные
      await loadExisting();
    } else {
      if (!uploadedVideoUrl.value) throw new Error(t('videos.addNew.missingVideoUrl'));
      const payload = {
        id: newId.value || genId(),
        preview_url: uploadedPreviewUrl.value,
        title: title.value,
        description: description.value,
        level: level.value,
        video_url: uploadedVideoUrl.value,
        duration: { seconds: durationSeconds.value },
        subtitles: buildSubtitlesPayload(editorSubtitles.value),
      };
      const res = await fetch('/api/video-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `Save failed (${res.status})`);
      saveOk.value = true;
      saveId.value = json?.id;
    }
  } catch (e: any) {
    saveError.value = e?.message || t('videos.addNew.saveError');
  } finally {
    saving.value = false;
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

.video-upload-form__form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.video-upload-form__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.video-upload-form__label {
  font-weight: 600;
}

.video-upload-form__input[type='file'] {
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fafafa;
}

.video-upload-form__hint {
  color: #6b7280;
  font-size: 12px;
}

.video-upload-form__actions {
  display: flex;
  gap: 12px;
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

.video-upload-form__progress {
  position: relative;
  height: 12px;
  background: #e5e7eb;
  border-radius: 999px;
  overflow: hidden;
}

.video-upload-form__progress-bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 0%;
  background: linear-gradient(90deg, #60a5fa, #2563eb);
  transition: width 0.2s ease;
}

.video-upload-form__progress-text {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: #374151;
}

.video-upload-form__status {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
}

.video-upload-form__status-title {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
}

.video-upload-form__status-body {
  margin: 0;
  white-space: pre-wrap;
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
    monospace;
  font-size: 12px;
}

.video-upload-form__error {
  color: #b91c1c;
  background: #fef2f2;
  border: 1px solid #fecaca;
  padding: 10px;
  border-radius: 8px;
}

.video-upload-form__subtitle {
  font-size: 18px;
  margin: 16px 0 8px;
}
.video-upload-form__preview {
  margin-top: 12px;
}
.video-upload-form__player {
  margin-top: 8px;
}
.video-upload-form__loader {
  margin-top: 16px;
}
.video-upload-form__editor {
  margin-top: 16px;
}
.video-upload-form__meta {
  margin-top: 16px;
}
.video-upload-form__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.video-upload-form__textarea {
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fafafa;
}
.video-upload-form__lang {
  display: flex;
  gap: 8px;
  align-items: center;
}
.video-upload-form__error {
  color: #b91c1c;
  background: #fef2f2;
  border: 1px solid #fecaca;
  padding: 10px;
  border-radius: 8px;
}
</style>
