<template>
  <section class="exercise-page">
    <div v-if="pendingLesson || (!lesson && !loadingTimedOut)" class="exercise-page__state">
      <div class="exercise-page__loader">{{ t('lessons.exercise.loading') }}</div>
    </div>
    <div v-else-if="errorLesson" class="exercise-page__state">
      {{ t('lessons.exercise.error', { message: errorLesson.message }) }}
    </div>
    <div v-else-if="!lesson && loadingTimedOut" class="exercise-page__state">
      {{ t('lessons.exercise.notFound') }}
    </div>

    <template v-else>
      <header class="exercise-page__header">
        <h1 class="exercise-page__title">{{ titleText }}</h1>
        <NuxtLink :to="backLink" class="exercise-page__back">
          {{ t('lessons.exercise.backToLesson') }}
        </NuxtLink>
      </header>

      <div class="exercise-page__content">
        <SubtitleClickExercise
          v-if="subs.length > 0"
          :subtitles="subs"
          :video-id="idParam"
          @range-change="handleExerciseRangeChange"
        />
        <div v-else class="exercise-page__empty">
          {{ t('clickExercise.empty') }}
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue';
import SubtitleClickExercise from '~/components/SubtitleClickExercise.vue';

const route = useRoute();
const supabase = useSupabaseClient();
const localePath = useLocalePath();
const { t } = useI18n();

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

interface ExerciseItem {
  th: string;
  ru: string;
  en: string;
}

interface LessonItem {
  id: string | number;
  title: Json | string;
  description?: Json | string | null;
  level?: string | null;
  video_url?: string | null;
  subtitles?: SubtitleItem[] | null;
  exercises?: ExerciseItem[] | null;
}

const idParam = computed(() => route.params.id as string);
const backLink = computed(() => localePath({ name: 'lessons-id', params: { id: idParam.value } }));

const {
  data: lesson,
  pending: pendingLesson,
  error: errorLesson,
} = await useAsyncData<LessonItem | null>(`lesson-exercise-${idParam.value}`, async () => {
  const { data, error } = await supabase
    .from('lesson_items')
    .select('id, title, description, level, video_url, subtitles, exercises')
    .eq('id', idParam.value)
    .maybeSingle();
  if (error) throw error;
  return data;
});

const { locale } = useI18n();

const currentLocale = computed<'ru' | 'en'>(() =>
  locale.value === 'ru' || locale.value === 'en' ? (locale.value as 'ru' | 'en') : 'en'
);

const titleText = computed(() => {
  const val = lesson.value?.title as Record<string, string> | string | undefined | null;
  if (!val) return '';
  if (typeof val === 'string') return val;
  return val[currentLocale.value] ?? val.en ?? val.ru ?? val.th ?? '';
});

const subs = computed<SubtitleItem[]>(() => {
  // Если есть субтитры, используем их
  if (lesson.value?.subtitles && lesson.value.subtitles.length > 0) {
    return lesson.value.subtitles as SubtitleItem[];
  }

  // Если нет субтитров, но есть упражнения, конвертируем их
  if (lesson.value?.exercises && lesson.value.exercises.length > 0) {
    return lesson.value.exercises.map((ex, index) => ({
      id: index + 1,
      start: 0,
      end: 0,
      text: {
        th: ex.th,
        ru: ex.ru,
        en: ex.en,
      },
    }));
  }

  return [];
});

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

watch(pendingLesson, (isPending) => {
  if (isPending) {
    startLoadingTimeout();
  } else {
    clearLoadingTimeout();
  }
});

watch(lesson, (newLesson) => {
  if (newLesson) {
    clearLoadingTimeout();
  }
});

onBeforeUnmount(() => {
  clearLoadingTimeout();
});

function handleExerciseRangeChange(range: PlaybackRange | null) {
  // Можно добавить логику при изменении диапазона
}

useHead(() => ({
  title: titleText.value || t('lessons.exercise.title'),
}));
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

  &__empty {
    text-align: center;
    padding: 40px;
    color: #6b7280;
  }
}
</style>
