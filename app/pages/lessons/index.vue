<template>
  <section class="lessons-page">
    <PageHeader :title="t('lessons.title')">
      <NuxtLink v-if="user" :to="localePath('/lessons/add-new')" class="btn btn_primary">
        {{ t('lessons.addNew') }}
      </NuxtLink>
    </PageHeader>

    <div v-if="pending" class="lessons-page__state">{{ t('common.loading') }}</div>
    <div v-else-if="error" class="lessons-page__state lessons-page__state_error">
      {{ error.message }}
    </div>
    <div v-else-if="!lessons || lessons.length === 0" class="lessons-page__state">
      {{ t('lessons.empty') }}
    </div>

    <div v-else class="lessons-page__grid">
      <ContentCard
        v-for="lesson in lessons"
        :key="lesson.id"
        :to="localePath(`/lessons/${lesson.id}`)"
        :title="getLessonTitle(lesson)"
        :description="getLessonDescription(lesson)"
        :thumbnail-url="lesson.preview_url"
        :level="lesson.level"
        :duration="getDuration(lesson)"
      />
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

<style scoped lang="scss">
.lessons-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;

  &__state {
    text-align: center;
    padding: 40px;
    color: #6b7280;

    &_error {
      color: #dc2626;
    }
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 24px;
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
}
</style>
