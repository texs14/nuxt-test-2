<template>
  <section class="lesson-detail">
    <div v-if="pending || (!lesson && !loadingTimedOut)" class="lesson-detail__loader">
      {{ t('lessons.detail.loading') }}
    </div>
    <div v-else-if="error" class="lesson-detail__error">
      {{ t('lessons.detail.error', { message: error.message }) }}
    </div>
    <div v-else-if="!lesson && loadingTimedOut" class="lesson-detail__error">
      {{ t('lessons.detail.notFound') }}
    </div>

    <template v-else>
      <header class="lesson-detail__header">
        <h1 class="lesson-detail__title">{{ titleText }}</h1>
        <NuxtLink :to="localePath('/lessons')" class="lesson-detail__back">
          {{ t('lessons.detail.backToList') }}
        </NuxtLink>
      </header>

      <div class="lesson-detail__content">
        <VideoPlayer
          v-if="lesson?.video_url"
          class="lesson-detail__player"
          :src="lesson.video_url"
          :subtitles="subs"
          :hide-navigation-buttons="true"
        />

        <div class="lesson-detail__meta">
          <span class="lesson-detail__level">{{ lesson?.level }}</span>
          <span class="lesson-detail__duration">{{ getDuration }}</span>
        </div>

        <div v-if="descriptionText" class="lesson-detail__description">
          <h2 class="lesson-detail__subtitle">{{ t('lessons.detail.description') }}</h2>
          <p class="lesson-detail__description-text">{{ descriptionText }}</p>
        </div>

        <div class="lesson-detail__actions">
          <NuxtLink
            :to="localePath(`/lessons/exercise/${lesson?.id}`)"
            class="lesson-detail__start-btn"
          >
            {{ t('lessons.detail.startExercise') }}
          </NuxtLink>
        </div>

        <section class="lesson-detail__comments">
          <h2 class="lesson-detail__subtitle">{{ t('lessons.detail.commentsTitle') }}</h2>

          <div v-if="user" class="lesson-detail__comment-form">
            <textarea
              v-model="newComment"
              class="lesson-detail__comment-input"
              :placeholder="t('lessons.detail.commentPlaceholder')"
              rows="3"
            ></textarea>
            <button
              class="lesson-detail__comment-submit"
              :disabled="!newComment.trim() || submittingComment"
              @click="submitComment"
            >
              {{ submittingComment ? t('lessons.detail.submitting') : t('lessons.detail.submit') }}
            </button>
          </div>
          <div v-else class="lesson-detail__comment-auth">
            <NuxtLink :to="localePath('/login')" class="lesson-detail__comment-auth-link">
              {{ t('lessons.detail.loginPrompt') }}
            </NuxtLink>
            {{ t('lessons.detail.loginPromptSuffix') }}
          </div>

          <div v-if="loadingComments" class="lesson-detail__comments-loader">
            {{ t('lessons.detail.commentsLoading') }}
          </div>
          <div v-else-if="commentsError" class="lesson-detail__comments-error">
            {{ t('lessons.detail.commentsError') }}
          </div>
          <div v-else-if="comments.length === 0" class="lesson-detail__comments-empty">
            {{ t('lessons.detail.commentsEmpty') }}
          </div>
          <div v-else class="lesson-detail__comments-list">
            <div v-for="comment in comments" :key="comment.id" class="lesson-comment">
              <div class="lesson-comment__header">
                <span class="lesson-comment__author">
                  {{ comment.profiles?.username || t('lessons.detail.anonymous') }}
                </span>
                <span class="lesson-comment__date">{{ formatDate(comment.created_at) }}</span>
              </div>
              <p class="lesson-comment__content">{{ comment.content }}</p>
            </div>
          </div>
        </section>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';

const route = useRoute();
const supabase = useSupabaseClient();
const user = useSupabaseUser();
const localePath = useLocalePath();
const { locale, t } = useI18n();

type Json = Record<string, any> | null;

interface LessonItem {
  id: string;
  title: Json | string;
  description?: Json | string | null;
  level?: string | null;
  preview_url?: string | null;
  video_url?: string | null;
  duration?: Json | null;
  subtitles?: any[] | null;
}

interface Comment {
  id: string;
  lesson_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: {
    username?: string;
    avatar_url?: string;
  };
}

const lessonId = computed(() => route.params.id as string);

const {
  data: lesson,
  pending,
  error,
} = await useAsyncData<LessonItem | null>(`lesson-${lessonId.value}`, async () => {
  const { data, error } = await supabase
    .from('lesson_items')
    .select('*')
    .eq('id', lessonId.value)
    .maybeSingle();

  if (error) throw error;
  return data;
});

const currentLocale = computed<'ru' | 'en' | 'th'>(() =>
  locale.value === 'ru' || locale.value === 'en' || locale.value === 'th'
    ? (locale.value as 'ru' | 'en' | 'th')
    : 'ru'
);

const titleText = computed(() => {
  const val = lesson.value?.title as Record<string, string> | string | undefined | null;
  if (!val) return '';
  if (typeof val === 'string') return val;
  return val[currentLocale.value] ?? val.ru ?? val.en ?? val.th ?? '';
});

const descriptionText = computed(() => {
  const val = lesson.value?.description as Record<string, string> | string | undefined | null;
  if (!val) return '';
  if (typeof val === 'string') return val;
  return val[currentLocale.value] ?? val.ru ?? val.en ?? val.th ?? '';
});

const getDuration = computed(() => {
  const dur = lesson.value?.duration as { text?: string; seconds?: number } | null;
  return dur?.text || '';
});

const subs = computed(() => {
  return (lesson.value?.subtitles || []) as any[];
});

const comments = ref<Comment[]>([]);
const loadingComments = ref(false);
const commentsError = ref(false);
const newComment = ref('');
const submittingComment = ref(false);

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

watch(pending, (isPending) => {
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

async function loadComments() {
  loadingComments.value = true;
  commentsError.value = false;
  try {
    const res = await fetch(`/api/lesson-items/${lessonId.value}/comments`);
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error);
    comments.value = json.comments || [];
  } catch (e) {
    commentsError.value = true;
  } finally {
    loadingComments.value = false;
  }
}

async function submitComment() {
  if (!newComment.value.trim()) return;
  submittingComment.value = true;
  try {
    const res = await fetch('/api/lesson-comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lesson_id: lessonId.value,
        content: newComment.value.trim(),
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error);
    newComment.value = '';
    await loadComments();
  } catch (e: any) {
    alert(t('lessons.detail.commentError', { error: e?.message || 'unknown' }));
  } finally {
    submittingComment.value = false;
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

await loadComments();

useHead(() => ({
  title: titleText.value || t('lessons.detail.title'),
}));
</script>

<style scoped>
.lesson-detail {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
}

.lesson-detail__loader,
.lesson-detail__error {
  text-align: center;
  padding: 40px;
  color: #6b7280;
}

.lesson-detail__error {
  color: #dc2626;
}

.lesson-detail__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #e5e7eb;
}

.lesson-detail__title {
  margin: 0;
  font-size: 32px;
  font-weight: 700;
}

.lesson-detail__back {
  padding: 8px 16px;
  background: #64748b;
  color: white;
  border-radius: 8px;
  text-decoration: none;
  font-size: 14px;
  transition: background 0.2s ease;
}

.lesson-detail__back:hover {
  background: #475569;
}

.lesson-detail__content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.lesson-detail__player {
  margin: 0 auto;
  max-width: 100%;
}

.lesson-detail__meta {
  display: flex;
  gap: 12px;
  font-size: 14px;
}

.lesson-detail__level {
  padding: 6px 12px;
  background: #dbeafe;
  color: #1e40af;
  border-radius: 6px;
  font-weight: 600;
}

.lesson-detail__duration {
  padding: 6px 12px;
  background: #f3f4f6;
  color: #374151;
  border-radius: 6px;
}

.lesson-detail__description {
  background: #f9fafb;
  padding: 20px;
  border-radius: 12px;
}

.lesson-detail__subtitle {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 12px;
}

.lesson-detail__description-text {
  margin: 0;
  line-height: 1.6;
  color: #374151;
}

.lesson-detail__actions {
  display: flex;
  gap: 12px;
}

.lesson-detail__start-btn {
  padding: 14px 28px;
  background: #10b981;
  color: white;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  font-size: 16px;
  transition: background 0.2s ease;
}

.lesson-detail__start-btn:hover {
  background: #059669;
}

.lesson-detail__comments {
  margin-top: 32px;
}

.lesson-detail__comment-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.lesson-detail__comment-input {
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
}

.lesson-detail__comment-submit {
  align-self: flex-start;
  padding: 10px 20px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
}

.lesson-detail__comment-submit:hover:not(:disabled) {
  background: #1d4ed8;
}

.lesson-detail__comment-submit:disabled {
  background: #93c5fd;
  cursor: not-allowed;
}

.lesson-detail__comment-auth {
  padding: 16px;
  background: #f3f4f6;
  border-radius: 8px;
  text-align: center;
  margin-bottom: 24px;
}

.lesson-detail__comment-auth-link {
  color: #2563eb;
  font-weight: 600;
  text-decoration: none;
}

.lesson-detail__comment-auth-link:hover {
  text-decoration: underline;
}

.lesson-detail__comments-loader,
.lesson-detail__comments-error,
.lesson-detail__comments-empty {
  text-align: center;
  padding: 20px;
  color: #6b7280;
}

.lesson-detail__comments-error {
  color: #dc2626;
}

.lesson-detail__comments-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.lesson-comment {
  padding: 16px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.lesson-comment__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.lesson-comment__author {
  font-weight: 600;
  color: #111827;
}

.lesson-comment__date {
  font-size: 12px;
  color: #9ca3af;
}

.lesson-comment__content {
  margin: 0;
  line-height: 1.5;
  color: #374151;
}
</style>
