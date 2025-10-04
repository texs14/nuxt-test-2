<template>
  <section class="exercise-page">
    <div v-if="pendingVideo || (!video && !loadingTimedOut)" class="exercise-page__state">
      <div class="exercise-page__loader">Загрузка видео…</div>
    </div>
    <div v-else-if="errorVideo" class="exercise-page__state">Ошибка: {{ errorVideo.message }}</div>
    <div v-else-if="!video && loadingTimedOut" class="exercise-page__state">Видео не найдено</div>

    <template v-else>
      <header class="exercise-page__header">
        <h1 class="exercise-page__title">{{ titleText }}</h1>
        <NuxtLink :to="backLink" class="exercise-page__back">{{ t('videos.title') }}</NuxtLink>
      </header>

      <div class="exercise-page__content">
        <ExerciseVideoPlayer
          v-if="video?.video_url"
          class="exercise-page__player"
          :src="video.video_url"
          :range="exerciseRange"
          @fragment-ended="handleFragmentEnded"
        />

        <SubtitleClickExercise
          :subtitles="subs"
          :video-id="idParam"
          @range-change="handleExerciseRangeChange"
        />
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import SubtitleClickExercise from '~/components/SubtitleClickExercise.vue';
import ExerciseVideoPlayer from '~/components/ExerciseVideoPlayer.vue';

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
const backLink = computed(() => localePath({ name: 'videos-id', params: { id: idParam.value } }));

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

const subs = computed<SubtitleItem[]>(() => (video.value?.subtitles || []) as SubtitleItem[]);
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

function handleExerciseRangeChange(range: PlaybackRange | null) {
  exerciseRange.value = range;
}

function handleFragmentEnded() {
  // Можно добавить логику при завершении фрагмента
}
</script>

<style scoped lang="scss">
.exercise-page {
  &__state {
    color: #666;
    padding: 20px;
    text-align: center;
  }

  &__header {
    display: flex;
    gap: 12px;
    align-items: baseline;
    margin-bottom: 24px;
    padding-bottom: 12px;
    border-bottom: 2px solid #e5e7eb;
  }

  &__title {
    margin: 0;
    font-size: 24px;
  }

  &__back {
    margin-left: auto;
    padding: 6px 12px;
    border-radius: 8px;
    background: #64748b;
    color: #fff;
    text-decoration: none;
    font-size: 14px;
    transition: background 0.2s ease;

    &:hover {
      background: #475569;
    }
  }

  &__content {
    display: grid;
    gap: 24px;
  }

  &__player {
    margin: auto;
    width: 60%;
  }
}
</style>
