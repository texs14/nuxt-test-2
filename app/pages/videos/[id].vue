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
        <NuxtLink v-if="canStartExercise" :to="exerciseLink" class="btn btn_success">
          {{ t('videos.exercise.startPage') }}
        </NuxtLink>
        <NuxtLink :to="editLink" class="btn btn_primary">{{ t('videos.edit') }}</NuxtLink>
      </PageHeader>

      <VideoPlayer
        v-if="video?.video_url"
        class="video-page__player"
        :src="video.video_url"
        :subtitles="subs"
        :restricted-range="exerciseRange"
        :hide-timeline="showExercise"
      />

      <p v-if="descriptionText" class="video-page__description">{{ descriptionText }}</p>

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
import SubtitleClickExercise from '~/components/SubtitleClickExercise.vue';
const route = useRoute();
const supabase = useSupabaseClient();

type Json = Record<string, any> | null;

interface ThaiSentences {
  sentences: string[][];
}

interface SubtitleText {
  th?: string | ThaiSentences;
  en?: string;
  ru?: string;
  [key: string]: string | ThaiSentences | undefined;
}

interface SubtitleItem {
  id?: number | string;
  start: number;
  end: number;
  text?: SubtitleText | string;
}

interface PlaybackRange {
  start: number;
  end: number;
}

interface VideoItem {
  id: string | number;
  title: Json | string;
  description?: Json | string | null;
  level?: string | null;
  video_url?: string | null;
  subtitles?: SubtitleItem[] | null;
}

const idParam = computed(() => route.params.id as string);
const localePath = useLocalePath();
const editLink = computed(() =>
  localePath({ name: 'videos-add-new', query: { editId: idParam.value } })
);
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

const subs = computed<SubtitleItem[]>(() => (video.value?.subtitles || []) as SubtitleItem[]);
const showExercise = ref(false);
const exerciseRange = ref<PlaybackRange | null>(null);

const loadingTimedOut = ref(false);
let loadingTimeout: ReturnType<typeof setTimeout> | null = null;

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
  subs.value.some((subtitle: SubtitleItem) => {
    if (!subtitle?.text) return false;
    if (typeof subtitle.text === 'string') return subtitle.text.trim().length > 0;
    const textObject = subtitle.text as SubtitleText | undefined;
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
