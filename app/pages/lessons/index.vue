<template>
  <ContentListPage
    :title="t('lessons.title')"
    :page-title="t('lessons.pageTitle')"
    :page-description="t('lessons.pageDescription')"
    :items="lessons"
    :pending="pending"
    :error="error"
    route-prefix="/lessons/"
    :loading-message="t('common.loading')"
    :empty-message="t('lessons.empty')"
  >
    <template #header-actions>
      <NuxtLink
        v-if="user && canModerate"
        :to="localePath('/lessons/add-new')"
        class="btn btn_primary"
      >
        {{ t('lessons.addNew') }}
      </NuxtLink>
    </template>
  </ContentListPage>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { LessonItem } from '~/types/content';

const { t } = useI18n();
const localePath = useLocalePath();
const user = useSupabaseUser();
const { canModerate } = useUserRole();
const {
  select,
  loading: crudLoading,
  error: crudError,
} = useSupabaseCrud({
  table: 'lesson_items',
});

const {
  data: lessons,
  pending: asyncPending,
  error: asyncError,
} = await useAsyncData<LessonItem[]>('lessons', async () => {
  const result = await select(undefined, {
    columns: 'id, title, description, level, preview_url, duration, created_at',
    orderBy: { column: 'created_at', ascending: false },
  });

  if (!result) {
    throw new Error(crudError.value || 'Failed to fetch lessons');
  }

  return result.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    level: item.level,
    preview_url: item.preview_url,
    duration: item.duration,
    created_at: item.created_at,
  })) as LessonItem[];
});

const pending = computed(() => asyncPending.value || crudLoading.value);
const error = computed<Error | null>(() => {
  if (asyncError.value) return asyncError.value;
  if (crudError.value) return new Error(crudError.value);
  return null;
});

useHead({
  title: t('lessons.title'),
});
</script>
