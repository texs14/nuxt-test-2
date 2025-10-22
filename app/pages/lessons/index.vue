<template>
  <section class="content-page">
    <header v-if="canModerate" class="content-page__header">
      <div class="content-page__actions">
        <NuxtLink :to="addNewLink" class="btn btn_primary">
          {{ t('lessons.addNew') }}
        </NuxtLink>
      </div>
    </header>

    <div class="content-page__intro">
      <h1 class="content-page__intro-title">{{ t('lessons.pageTitle') }}</h1>
      <p class="content-page__intro-description">{{ t('lessons.pageDescription') }}</p>
    </div>

    <div v-if="pending" class="content-page__state">
      {{ t('common.loading') }}
    </div>
    <div v-else-if="error" class="content-page__state content-page__state_error">
      {{ t('lessons.error') }}: {{ error.message }}
    </div>
    <div v-else-if="!lessons || lessons.length === 0" class="content-page__state">
      {{ t('lessons.empty') }}
    </div>

    <div v-else class="content-page__grid">
      <VideoCard
        v-for="item in lessons"
        :key="item.id"
        :item="item"
        route-prefix="/lessons/"
        :show-delete-button="canModerate"
        @delete="openDeleteModal"
      />
    </div>

    <DeleteConfirmationModal
      v-model:open="showDeleteModal"
      :title="'Delete Lesson'"
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
import type { LessonItem, BaseContentItem } from '~/types/content';
import DeleteConfirmationModal from '~/components/modals/DeleteConfirmationModal.vue';
import VideoCard from '~/components/VideoCard.vue';

const {
  select,
  loading: crudLoading,
  error: crudError,
} = useSupabaseCrud({
  table: 'lesson_items',
});
const { t } = useI18n();
const safeLocalePath = useSafeLocalePath();
const { canModerate } = useUserRole();
const toast = useToast();
const { getLocalizedValue } = useLocalizedContent();

const addNewLink = computed(() => {
  return safeLocalePath({ name: 'lessons-add-new' });
});

// Deletion state
const showDeleteModal = ref(false);
const selectedLesson = ref<{ id: string; title: string } | null>(null);
const isDeleting = ref(false);

const deleteMessage = computed(() => {
  if (!selectedLesson.value) return '';
  return `Are you sure you want to delete '${selectedLesson.value.title}'? This action cannot be undone.`;
});

const {
  data: lessons,
  pending: asyncPending,
  error: asyncError,
  refresh,
} = useLazyAsyncData<LessonItem[]>('lessons', async () => {
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

function openDeleteModal(item: BaseContentItem) {
  selectedLesson.value = {
    id: String(item.id),
    title: getLocalizedValue(item.title),
  };
  showDeleteModal.value = true;
}

function handleDeleteCancel() {
  showDeleteModal.value = false;
  selectedLesson.value = null;
}

async function handleDeleteConfirm() {
  if (!selectedLesson.value) return;

  isDeleting.value = true;

  try {
    const response = await $fetch('/api/videos/delete', {
      method: 'POST',
      body: {
        id: selectedLesson.value.id,
        type: 'lesson',
      },
    });

    if (response.ok) {
      toast.add({
        title: 'Success',
        description: response.message || 'Lesson deleted successfully',
        color: 'green',
      });

      showDeleteModal.value = false;
      selectedLesson.value = null;

      // Refresh lesson list
      await refresh();
    } else {
      toast.add({
        title: 'Error',
        description: response.error || response.message || 'Failed to delete lesson',
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

useHead({
  title: t('lessons.title'),
});
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
