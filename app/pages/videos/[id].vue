<template>
  <section class="video-page">
    <div v-if="pendingVideo || (!video && !loadingTimedOut)" class="video-page__state">
      <div class="video-page__loader">Загрузка видео…</div>
    </div>
    <div v-else-if="errorVideo" class="video-page__state">Ошибка: {{ errorVideo.message }}</div>
    <div v-else-if="!video && loadingTimedOut" class="video-page__state">Видео не найдено</div>

    <template v-else>
      <PageHeader :title="titleText">
        <span v-if="video?.level" class="badge badge_level">{{ video.level }}</span>

        <button v-if="canModerate" class="btn btn_primary" type="button" @click="toggleEditMode">
          {{ isEditMode ? t('videos.detail.cancelEdit') : t('videos.detail.edit') }}
        </button>
      </PageHeader>

      <VideoPlayer
        v-if="video?.video_url"
        class="video-page__player"
        :src="video.video_url"
        :subtitles="subs"
        :restricted-range="exerciseRange"
        :hide-timeline="showExercise"
      />

      <section v-if="isEditMode" class="video-page__editor">
        <h2 class="video-page__subtitle">{{ t('videos.detail.editVideo') }}</h2>

        <div class="video-page__editor-form">
          <SubtitleEditor v-model="editorSubtitles" />

          <VideoMetaForm
            :title="editTitle"
            :description="editDescription"
            :level="editLevel"
            :saving="savingChanges"
            :save-error="saveError"
            :save-ok="saveSuccess"
            :save-id="idParam"
            :can-save="true"
            @update:title="onUpdateEditTitle"
            @update:description="onUpdateEditDescription"
            @update:level="onUpdateEditLevel"
            @save="saveChanges"
          />
        </div>
      </section>

      <p v-if="descriptionText" class="video-page__description">{{ descriptionText }}</p>

      <NuxtLink v-if="canStartExercise" :to="exerciseLink" class="btn btn_success">
        {{ t('videos.exercise.startPage') }}
      </NuxtLink>

      <CommentsList
        :title="t('comments.title')"
        :comments="comments"
        :loading="pendingComments"
        :error="!!errorComments"
        :loading-text="t('comments.loading')"
        :error-text="t('comments.error')"
        :empty-text="t('comments.empty')"
        :anonymous-text="t('comments.anonymous')"
      />
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import type {
  PlaybackRange,
  SubtitleItem as RawSubtitleItem,
  SubtitleText as RawSubtitleText,
  ThaiSentences,
} from '@/types/video.types';
import SubtitleClickExercise from '~/components/SubtitleClickExercise.vue';
const route = useRoute();
const supabase = useSupabaseClient();
const { canModerate } = useUserRole();

type Json = Record<string, any> | null;

type LocaleText = { th?: string; ru?: string; en?: string };
type EditorSubtitleItem = {
  id?: number | string;
  start: number;
  end: number;
  text?: { th?: string; ru?: string; en?: string } | string;
};

interface VideoItem {
  id: string | number;
  title: Json | string;
  description?: Json | string | null;
  level?: string | null;
  video_url?: string | null;
  subtitles?: RawSubtitleItem[] | null;
}

const idParam = computed(() => route.params.id as string);
const localePath = useLocalePath();
const exerciseLink = computed(() =>
  localePath({ name: 'videos-exercise-id', params: { id: idParam.value } })
);

const {
  data: video,
  pending: pendingVideo,
  error: errorVideo,
} = await useAsyncData<VideoItem | null>(
  () => `video-${idParam.value}`,
  async () => {
    const { data, error } = await supabase
      .from('video_items')
      .select('id, title, description, level, video_url, subtitles')
      .eq('id', idParam.value)
      .maybeSingle();
    if (error) throw error;
    return data;
  }
);

interface CommentItem {
  id: string | number;
  text?: string | null;
  author?: string | null;
  created_at?: string | null;
}
const {
  data: comments,
  pending: pendingComments,
  error: errorComments,
} = await useAsyncData<CommentItem[]>(
  () => `comments-${idParam.value}`,
  async () => {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('video_id', idParam.value)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  }
);

const { locale, t } = useI18n();
const currentLocale = computed<'ru' | 'en'>(() =>
  locale.value === 'ru' || locale.value === 'en' ? (locale.value as 'ru' | 'en') : 'en'
);

const titleText = computed(() => {
  const val = video.value?.title as Record<string, string> | string | undefined | null;
  if (!val) return '';
  if (typeof val === 'string') return val;
  return val[currentLocale.value] ?? val.en ?? val.ru ?? val.th ?? '';
});

const descriptionText = computed(() => {
  const val = video.value?.description as Record<string, string> | string | undefined | null;
  if (!val) return '';
  if (typeof val === 'string') return val;
  return val[currentLocale.value] ?? val.en ?? val.ru ?? val.th ?? '';
});

const subs = computed<RawSubtitleItem[]>(() => (video.value?.subtitles || []) as RawSubtitleItem[]);
const showExercise = ref(false);
const exerciseRange = ref<PlaybackRange | null>(null);

const loadingTimedOut = ref(false);
let loadingTimeout: ReturnType<typeof setTimeout> | null = null;

const isEditMode = ref(false);
const editorSubtitles = ref<EditorSubtitleItem[]>([]);
const editTitle = ref<LocaleText>({ th: '', ru: '', en: '' });
const editDescription = ref<LocaleText>({ th: '', ru: '', en: '' });
const editLevel = ref<string>('A1');
const savingChanges = ref(false);
const saveSuccess = ref(false);
const saveError = ref('');
const saveId = ref<string | number>('');

function startLoadingTimeout() {
  loadingTimedOut.value = false;
  if (loadingTimeout) clearTimeout(loadingTimeout);
  loadingTimeout = setTimeout(() => {
    loadingTimedOut.value = true;
  }, 30000);
}

function clearLoadingTimeout() {
  if (loadingTimeout) {
    clearTimeout(loadingTimeout);
    loadingTimeout = null;
  }
  loadingTimedOut.value = false;
}

startLoadingTimeout();

watch(pendingVideo, (isPending) => {
  if (isPending) {
    startLoadingTimeout();
  } else {
    clearLoadingTimeout();
  }
});

watch(video, (newVideo) => {
  if (newVideo) {
    clearLoadingTimeout();
  }
});

onBeforeUnmount(() => {
  clearLoadingTimeout();
});
const isThaiSentences = (value: any): value is ThaiSentences =>
  value && typeof value === 'object' && Array.isArray(value.sentences);

const hasThaiWords = (value: string | ThaiSentences | undefined): boolean => {
  if (!value) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (isThaiSentences(value)) {
    return value.sentences?.some(
      (sentence) =>
        Array.isArray(sentence) && sentence.some((word) => Boolean(word && word.trim?.().length))
    );
  }
  return false;
};

const canStartExercise = computed(() =>
  subs.value.some((subtitle: RawSubtitleItem) => {
    if (!subtitle?.text) return false;
    if (typeof subtitle.text === 'string') return subtitle.text.trim().length > 0;
    const textObject = subtitle.text as RawSubtitleText | undefined;
    const thaiText = textObject?.th ?? textObject?.['th-TH'] ?? textObject?.th_th;
    return hasThaiWords(thaiText as string | ThaiSentences | undefined);
  })
);

function startExercise() {
  if (!canStartExercise.value) return;
  showExercise.value = true;
}

function handleExerciseRangeChange(range: PlaybackRange | null) {
  exerciseRange.value = range;
}

watch(showExercise, (value) => {
  if (!value) exerciseRange.value = null;
});

function prepareThaiEditorValue(value: string | ThaiSentences | undefined): string {
  if (!value) return '';
  if (typeof value === 'object') {
    return (value.sentences || [])
      .map((sentence) =>
        (sentence || [])
          .map((word) => word.trim())
          .filter(Boolean)
          .join(' ')
      )
      .filter((sentence) => sentence.length > 0)
      .join('   ');
  }
  return value
    .replace(/\r?\n/gu, ' ')
    .replace(/\u00A0/gu, ' ')
    .trim();
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
    .split(/(?:\s{3,}|\.\s*)/gu)
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
    const text = typeof item.text === 'string' ? { ru: item.text } : { ...(item.text ?? {}) };
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

function toggleEditMode() {
  isEditMode.value = !isEditMode.value;
  if (isEditMode.value && video.value) {
    editTitle.value = normalizeLocaleText(video.value.title);
    editDescription.value = normalizeLocaleText(video.value.description);
    editLevel.value = String(video.value.level || 'A1');
    editorSubtitles.value = normalizeEditorSubtitles(
      (video.value.subtitles as RawSubtitleItem[]) || []
    );
    saveSuccess.value = false;
    saveError.value = '';
    saveId.value = idParam.value;
  }
}

function onUpdateEditTitle(v: LocaleText) {
  editTitle.value = v;
}

function onUpdateEditDescription(v: LocaleText) {
  editDescription.value = v;
}

function onUpdateEditLevel(v: string) {
  editLevel.value = v;
}

async function saveChanges() {
  saveError.value = '';
  saveSuccess.value = false;
  savingChanges.value = true;
  try {
    const payload = {
      subtitles: buildSubtitlesPayload(editorSubtitles.value),
      title: editTitle.value,
      description: editDescription.value,
      level: editLevel.value,
    };
    const res = await fetch(`/api/video-items/${encodeURIComponent(idParam.value)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || 'unknown');
    saveSuccess.value = true;
    saveId.value = json?.id || idParam.value;
    if (video.value) {
      video.value = {
        ...video.value,
        title: editTitle.value,
        description: editDescription.value,
        level: editLevel.value,
        subtitles: payload.subtitles,
      } as VideoItem;
    }
  } catch (e: any) {
    saveError.value = t('videos.detail.saveError', { error: e?.message || 'unknown' });
  } finally {
    savingChanges.value = false;
  }
}
</script>

<style scoped lang="scss">
.video-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;

  &__state {
    text-align: center;
    padding: 40px;
    color: #6b7280;
  }

  &__player {
    margin: 0 auto 24px;
    max-width: 100%;
  }

  &__editor {
    margin-top: 24px;
    padding: 24px;
    background: #f9fafb;
    border-radius: 12px;
  }

  &__subtitle {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
  }

  &__editor-form {
    margin-top: 20px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  &__description {
    padding: 20px;
    background: #f9fafb;
    border-radius: 12px;
    color: #374151;
    line-height: 1.6;
    margin-bottom: 24px;
  }
}

.btn {
  padding: 10px 20px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  font-size: 14px;
  transition: background 0.2s ease;
  display: inline-block;

  &_primary {
    background: #2563eb;
    color: white;

    &:hover {
      background: #1d4ed8;
    }
  }

  &_success {
    background: #16a34a;
    color: white;

    &:hover {
      background: #15803d;
    }
  }
}

.badge {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;

  &_level {
    background: #dbeafe;
    color: #1e40af;
  }
}
</style>
