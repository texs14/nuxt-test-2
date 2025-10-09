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
import { useI18n } from 'vue-i18n';
import type { LessonItem } from '~/types/content';

const { t } = useI18n();
const localePath = useLocalePath();
const supabase = useSupabaseClient();
const user = useSupabaseUser();
const { canModerate } = useUserRole();

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

useHead({
  title: t('lessons.title'),
});
</script>
