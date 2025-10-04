<template>
  <section class="lessons-page">
    <header class="lessons-page__header">
      <h1 class="lessons-page__title">{{ t('lessons.title') }}</h1>
      <NuxtLink v-if="user" :to="localePath('/lessons/add-new')" class="lessons-page__add-btn">
        {{ t('lessons.addNew') }}
      </NuxtLink>
    </header>

    <div v-if="pending" class="lessons-page__loader">{{ t('common.loading') }}</div>
    <div v-else-if="error" class="lessons-page__error">{{ error.message }}</div>
    <div v-else-if="!lessons || lessons.length === 0" class="lessons-page__empty">
      {{ t('lessons.empty') }}
    </div>

    <div v-else class="lessons-page__grid">
      <NuxtLink
        v-for="lesson in lessons"
        :key="lesson.id"
        :to="localePath(`/lessons/${lesson.id}`)"
        class="lesson-card"
      >
        <div v-if="lesson.preview_url" class="lesson-card__preview">
          <img :src="lesson.preview_url" :alt="getLessonTitle(lesson)" class="lesson-card__img" />
        </div>
        <div class="lesson-card__content">
          <h3 class="lesson-card__title">{{ getLessonTitle(lesson) }}</h3>
          <p class="lesson-card__description">{{ getLessonDescription(lesson) }}</p>
          <div class="lesson-card__meta">
            <span class="lesson-card__level">{{ lesson.level }}</span>
            <span class="lesson-card__duration">{{ getDuration(lesson) }}</span>
          </div>
        </div>
      </NuxtLink>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t, locale } = useI18n();
const localePath = useLocalePath();
const supabase = useSupabaseClient();
const user = useSupabaseUser();

type Json = Record<string, any> | null;

interface LessonItem {
  id: string;
  title: Json | string;
  description?: Json | string | null;
  level?: string | null;
  preview_url?: string | null;
  duration?: Json | null;
  created_at: string;
}

const {
  data: lessons,
  pending,
  error,
} = await useAsyncData<LessonItem[]>('lessons', async () => {
  const { data, error } = await supabase
    .from('lesson_items')
    .select('id, title, description, level, preview_url, duration, created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
});

const currentLocale = computed<'ru' | 'en' | 'th'>(() =>
  locale.value === 'ru' || locale.value === 'en' || locale.value === 'th'
    ? (locale.value as 'ru' | 'en' | 'th')
    : 'ru'
);

function getLessonTitle(lesson: LessonItem): string {
  const val = lesson.title as Record<string, string> | string | undefined | null;
  if (!val) return '';
  if (typeof val === 'string') return val;
  return val[currentLocale.value] ?? val.ru ?? val.en ?? val.th ?? '';
}

function getLessonDescription(lesson: LessonItem): string {
  const val = lesson.description as Record<string, string> | string | undefined | null;
  if (!val) return '';
  if (typeof val === 'string') return val;
  return val[currentLocale.value] ?? val.ru ?? val.en ?? val.th ?? '';
}

function getDuration(lesson: LessonItem): string {
  const dur = lesson.duration as { text?: string; seconds?: number } | null;
  return dur?.text || '';
}

useHead({
  title: t('lessons.title'),
});
</script>

<style scoped>
.lessons-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.lessons-page__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.lessons-page__title {
  font-size: 32px;
  font-weight: 700;
  margin: 0;
}

.lessons-page__add-btn {
  padding: 10px 20px;
  background: #2563eb;
  color: white;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  transition: background 0.2s ease;
}

.lessons-page__add-btn:hover {
  background: #1d4ed8;
}

.lessons-page__loader,
.lessons-page__error,
.lessons-page__empty {
  text-align: center;
  padding: 40px;
  color: #6b7280;
}

.lessons-page__error {
  color: #dc2626;
}

.lessons-page__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}

.lesson-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
}

.lesson-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.lesson-card__preview {
  width: 100%;
  aspect-ratio: 16/9;
  background: #f3f4f6;
  overflow: hidden;
}

.lesson-card__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.lesson-card__content {
  padding: 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.lesson-card__title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px;
  color: #111827;
}

.lesson-card__description {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 12px;
  flex: 1;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.lesson-card__meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
}

.lesson-card__level {
  padding: 4px 8px;
  background: #dbeafe;
  color: #1e40af;
  border-radius: 4px;
  font-weight: 600;
}

.lesson-card__duration {
  padding: 4px 8px;
  background: #f3f4f6;
  color: #374151;
  border-radius: 4px;
}
</style>
