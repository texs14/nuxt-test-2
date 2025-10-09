<template>
  <ContentListPage
    :title="t('videos.title')"
    :page-title="t('videos.pageTitle')"
    :page-description="t('videos.pageDescription')"
    :items="items"
    :pending="pending"
    :error="error"
    route-prefix="/videos/"
    :loading-message="t('videos.loading')"
    :error-message-prefix="t('videos.error')"
  >
    <template #header-actions>
      <NuxtLink v-if="addNewLink !== '#'" :to="addNewLink" class="btn btn_primary">
        {{ t('videos.add') }}
      </NuxtLink>
    </template>
  </ContentListPage>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { VideoItem } from '~/types/content';

const supabase = useSupabaseClient();
const { t } = useI18n();
const safeLocalePath = useSafeLocalePath();
const { canModerate } = useUserRole();

const addNewLink = computed(() => {
  if (!canModerate.value) return '#';
  return safeLocalePath({ name: 'videos-add-new' });
});

const {
  data: items,
  pending,
  error,
} = await useAsyncData<VideoItem[]>('video-items', async () => {
  const { data, error } = await supabase
    .from('video_items')
    .select('id, title, description, level, preview_url, duration')
    .order('id', { ascending: true });

  if (error) throw error;
  return data || [];
});
</script>
