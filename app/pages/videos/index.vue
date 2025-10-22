<template>
  <section class="content-page">
    <header v-if="canModerate" class="content-page__header">
      <div class="content-page__actions">
        <NuxtLink :to="addNewLink" class="btn btn_primary">
          {{ t('videos.add') }}
        </NuxtLink>
      </div>
    </header>

    <div class="content-page__intro">
      <h1 class="content-page__intro-title">{{ t('videos.pageTitle') }}</h1>
      <p class="content-page__intro-description">{{ t('videos.pageDescription') }}</p>
    </div>

    <div v-if="pending" class="content-page__state">
      {{ t('videos.loading') }}
    </div>
    <div v-else-if="error" class="content-page__state content-page__state_error">
      {{ t('videos.error') }}: {{ error.message }}
    </div>
    <div v-else-if="!items || items.length === 0" class="content-page__state">
      No videos available
    </div>

    <div v-else class="content-page__grid">
      <VideoCard
        v-for="item in items"
        :key="item.id"
        :item="item"
        route-prefix="/videos/"
        :show-delete-button="canModerate"
        @delete="openDeleteModal"
      />
    </div>

    <DeleteConfirmationModal
      v-model:open="showDeleteModal"
      :title="'Delete Video'"
      :message="deleteMessage"
      :loading="isDeleting"
      :dismissible="!isDeleting"
      @confirm="handleDeleteConfirm"
      @cancel="handleDeleteCancel"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { VideoItem, BaseContentItem } from '~/types/content';
import DeleteConfirmationModal from '~/components/modals/DeleteConfirmationModal.vue';
import VideoCard from '~/components/VideoCard.vue';

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
const toast = useToast();
const { getLocalizedValue } = useLocalizedContent();

const addNewLink = computed(() => {
  return safeLocalePath({ name: 'videos-add-new' });
});

// Deletion state
const showDeleteModal = ref(false);
const selectedVideo = ref<{ id: string; title: string } | null>(null);
const isDeleting = ref(false);

const deleteMessage = computed(() => {
  if (!selectedVideo.value) return '';
  return `Are you sure you want to delete '${selectedVideo.value.title}'? This action cannot be undone.`;
});

// Используем useLazyAsyncData чтобы запрос выполнялся на клиенте
// где доступен токен авторизации для корректной работы RLS политик
const {
  data: items,
  pending: asyncPending,
  error: asyncError,
  refresh,
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

function openDeleteModal(item: BaseContentItem) {
  selectedVideo.value = { 
    id: String(item.id), 
    title: getLocalizedValue(item.title) 
  };
  showDeleteModal.value = true;
}

function handleDeleteCancel() {
  showDeleteModal.value = false;
  selectedVideo.value = null;
}

async function handleDeleteConfirm() {
  if (!selectedVideo.value) return;

  isDeleting.value = true;

  try {
    const response = await $fetch('/api/videos/delete', {
      method: 'POST',
      body: {
        id: selectedVideo.value.id,
        type: 'video',
      },
    });

    if (response.ok) {
      toast.add({
        title: 'Success',
        description: response.message || 'Video deleted successfully',
        color: 'green',
      });

      showDeleteModal.value = false;
      selectedVideo.value = null;

      // Refresh video list
      await refresh();
    } else {
      toast.add({
        title: 'Error',
        description: response.error || response.message || 'Failed to delete video',
        color: 'red',
      });
    }
  } catch (err: any) {
    toast.add({
      title: 'Error',
      description: err.message || 'Network error occurred',
      color: 'red',
    });
  } finally {
    isDeleting.value = false;
  }
}
</script>

<style scoped lang="scss">
@use '~/assets/styles/layouts/content-page';

.content-page__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  padding-bottom: 16px;
}

.content-page__actions {
  display: flex;
  gap: 12px;
  align-items: center;
}
</style>
