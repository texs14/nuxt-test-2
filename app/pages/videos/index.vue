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
    :add-new-route="addNewLink"
    :add-new-button-text="t('videos.add')"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { VideoItem } from '~/types/content';

const {
  select,
  loading: crudLoading,
  error: crudError,
} = useSupabaseCrud({
  table: 'video_items',
});
const { t } = useI18n();
const safeLocalePath = useSafeLocalePath();
const { canModerate } = useUserRole();

const addNewLink = computed(() => {
  return safeLocalePath({ name: 'videos-add-new' });
});

// Используем useLazyAsyncData чтобы запрос выполнялся на клиенте
// где доступен токен авторизации для корректной работы RLS политик
const {
  data: items,
  pending: asyncPending,
  error: asyncError,
} = useLazyAsyncData<VideoItem[]>('video-items', async () => {
  // Фильтрация по статусу происходит на уровне RLS политик в БД
  // Обычные пользователи увидят только approved видео
  // Модераторы и админы увидят все видео
  const result = await select(undefined, {
    columns: 'id, title, description, level, preview_url, duration, status',
    orderBy: { column: 'id', ascending: true },
  });

  if (!result) {
    throw new Error(crudError.value || 'Failed to fetch video items');
  }

  return result.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    level: item.level,
    preview_url: item.preview_url,
    duration: item.duration,
    status: item.status,
  })) as VideoItem[];
});

const pending = computed(() => asyncPending.value || crudLoading.value);
const error = computed<Error | null>(() => {
  if (asyncError.value) return asyncError.value;
  if (crudError.value) return new Error(crudError.value);
  return null;
});
</script>
