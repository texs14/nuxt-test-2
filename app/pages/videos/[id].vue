<template>
  <ContentDetailLayout
    :title="titleText"
    :level="video?.level!"
    :loading="pendingVideo || (!video && !loadingTimedOut)"
    :error="errorVideo?.message || (!video && loadingTimedOut ? 'Видео не найдено' : null)"
    :loading-text="'Загрузка видео…'"
    :error-text="errorVideo ? `Ошибка: ${errorVideo.message}` : 'Видео не найдено'"
  >
    <template #header-actions>
      <NuxtLink :to="localePath('/videos')" class="btn btn_secondary">
        {{ t('videos.detail.backToList') }}
      </NuxtLink>
    </template>

    <template #player>
      <VideoPlayer
        v-if="video?.video_url"
        :src="video.video_url"
        :subtitles="subs"
        :restricted-range="exerciseRange"
        :hide-timeline="showExercise"
      />
    </template>

    <template #description>
      <p v-if="descriptionText">{{ descriptionText }}</p>
    </template>

    <template #actions>
      <NuxtLink v-if="canStartExercise" :to="exerciseLink" class="btn btn_success">
        {{ t('videos.exercise.startPage') }}
      </NuxtLink>
      <UiButton v-if="canModerate" class="btn btn_primary" type="button" @click="toggleEditMode">
        {{ isEditMode ? t('videos.detail.cancelEdit') : t('videos.detail.edit') }}
      </UiButton>
    </template>

    <template v-if="isEditMode" #editor>
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
    </template>

    <template #comments>
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
  </ContentDetailLayout>
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
const {
  select: selectVideo,
  loading: videoLoading,
  error: videoCrudError,
} = useSupabaseCrud({
  table: 'video_items',
});
const {
  select: selectComments,
  loading: commentsLoading,
  error: commentsCrudError,
} = useSupabaseCrud({
  table: 'comments',
});
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
  pending: asyncPendingVideo,
  error: asyncErrorVideo,
} = await useAsyncData<VideoItem | null>(
  () => `video-${idParam.value}`,
  async () => {
    const result = await selectVideo(
      { id: idParam.value },
      {
        columns: 'id, title, description, level, video_url, subtitles',
        limit: 1,
      }
    );

    if (!result || result.length === 0) {
      if (videoCrudError.value) throw new Error(videoCrudError.value);
      return null;
    }

    return result[0] as VideoItem;
  }
);

const pendingVideo = computed(() => asyncPendingVideo.value || videoLoading.value);
const errorVideo = computed<Error | null>(() => {
  if (asyncErrorVideo.value) return asyncErrorVideo.value;
  if (videoCrudError.value) return new Error(videoCrudError.value);
  return null;
});

interface CommentItem {
  id: string | number;
  text?: string | null;
  author?: string | null;
  created_at?: string | null;
}
const {
  data: comments,
  pending: asyncPendingComments,
  error: asyncErrorComments,
} = await useAsyncData<CommentItem[]>(
  () => `comments-${idParam.value}`,
  async () => {
    const result = await selectComments(
      { video_id: idParam.value },
      {
        orderBy: { column: 'created_at', ascending: true },
      }
    );

    if (!result) {
      if (commentsCrudError.value) throw new Error(commentsCrudError.value);
      return [];
    }

    return result as CommentItem[];
  }
);

const pendingComments = computed(() => asyncPendingComments.value || commentsLoading.value);
const errorComments = computed<Error | null>(() => {
  if (asyncErrorComments.value) return asyncErrorComments.value;
  if (commentsCrudError.value) return new Error(commentsCrudError.value);
  return null;
});

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
}
</style>
