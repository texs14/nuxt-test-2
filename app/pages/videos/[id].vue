<template>
  <section class="video-page">
    <div v-if="pendingVideo" class="video-page__state">Загрузка видео…</div>
    <div v-else-if="errorVideo" class="video-page__state">Ошибка: {{ errorVideo.message }}</div>
    <div v-else-if="!video" class="video-page__state">Видео не найдено</div>

    <template v-else>
      <header class="video-page__header">
        <h1 class="video-page__title">{{ titleText }}</h1>
        <span v-if="video.level" class="video-page__level">{{ video.level }}</span>
        <NuxtLink :to="editLink" class="video-page__edit">{{ t('videos.edit') }}</NuxtLink>
      </header>

      <VideoPlayer
        v-if="video.video_url"
        class="video-page__player"
        :src="video.video_url"
        :subtitles="subs"
        :restricted-range="exerciseRange"
        :hide-timeline="showExercise"
      />

      <p v-if="descriptionText" class="video-page__description">{{ descriptionText }}</p>

      <section class="video-page__exercise">
        <button
          v-if="!showExercise"
          class="video-page__exercise_button"
          type="button"
          :disabled="!canStartExercise"
          @click="startExercise"
        >
          {{ t('videos.exercise.start') }}
        </button>

        <SubtitleSentenceExercise
          v-if="showExercise"
          :subtitles="subs"
          @range-change="handleExerciseRangeChange"
        />

        <p v-if="!canStartExercise" class="video-page__exercise_hint">
          {{ t('videos.exercise.hintNoThai') }}
        </p>
      </section>

      <section class="video-page__comments">
        <h2 class="video-page__comments_title">{{ t('comments.title') }}</h2>
        <div v-if="pendingComments" class="video-page__state">{{ t('comments.loading') }}</div>
        <div v-else-if="errorComments" class="video-page__state">
          {{ t('comments.error') }}: {{ errorComments.message }}
        </div>
        <ul v-else class="video-page__comments_list">
          <li v-for="c in comments" :key="c.id" class="video-page__comments_item">
            <div class="video-page__comments_head">
              <strong class="video-page__comments_author">{{
                c.author || t('comments.anonymous')
              }}</strong>
              <time v-if="c.created_at" class="video-page__comments_time">{{
                new Date(c.created_at).toLocaleString()
              }}</time>
            </div>
            <p class="video-page__comments_text">{{ c.text }}</p>
          </li>
        </ul>
      </section>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import SubtitleSentenceExercise from '~/components/SubtitleSentenceExercise.vue';
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
  &__state {
    color: #666;
  }

  &__header {
    display: flex;
    gap: 12px;
    align-items: baseline;
    margin-bottom: 12px;
  }

  &__title {
    margin: 0;
  }

  &__level {
    padding: 4px 8px;
    background: #111;
    color: #fff;
    border-radius: 8px;
    font-size: 12px;
  }

  &__edit {
    margin-left: auto;
    padding: 6px 10px;
    border-radius: 8px;
    background: #2563eb;
    color: #fff;
    text-decoration: none;
    font-size: 14px;
  }

  &__player {
    margin: auto;
    width: 50%;
  }

  &__description {
    color: #222;
  }

  &__exercise {
    margin: 24px 0;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  &__exercise_button {
    align-self: flex-start;
    padding: 10px 18px;
    border-radius: 10px;
    border: none;
    background: #2563eb;
    color: #fff;
    cursor: pointer;
    transition: background 0.2s ease;

    &:disabled {
      background: #94a3b8;
      cursor: not-allowed;
    }
  }

  &__exercise_hint {
    margin: 0;
    color: #777;
  }

  &__comments {
    margin-top: 20px;
  }
  &__comments_title {
    font-size: 18px;
    margin: 0 0 8px;
  }
  &__comments_list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 12px;
  }
  &__comments_item {
    padding: 10px;
    border: 1px solid #eee;
    border-radius: 8px;
    background: #fafafa;
  }
  &__comments_head {
    display: flex;
    gap: 8px;
    align-items: baseline;
  }
  &__comments_author {
    font-weight: 600;
  }
  &__comments_time {
    color: #777;
    font-size: 12px;
  }
  &__comments_text {
    margin: 6px 0 0;
  }
}
</style>
