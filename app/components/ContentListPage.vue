<template>
  <section class="content-page">
    <header v-if="title" class="content-page__header">
      <h1 class="content-page__title">{{ title }}</h1>
      <div v-if="addNewRoute && canModerate" class="content-page__actions">
        <NuxtLink :to="addNewRoute" class="btn btn_primary">
          {{ addNewButtonText }}
        </NuxtLink>
      </div>
    </header>

    <div v-if="pageTitle || pageDescription || $slots['page-intro']" class="content-page__intro">
      <div v-if="$slots['page-intro']">
        <slot name="page-intro" />
      </div>
      <div v-else>
        <h1 v-if="pageTitle" class="content-page__intro-title">{{ pageTitle }}</h1>
        <p v-if="pageDescription" class="content-page__intro-description">{{ pageDescription }}</p>
      </div>
    </div>

    <div v-if="pending" class="content-page__state">
      {{ loadingMessage }}
    </div>
    <div v-else-if="error" class="content-page__state content-page__state_error">
      {{ errorMessage }}
    </div>
    <div v-else-if="showEmptyState" class="content-page__state">
      {{ emptyMessage }}
    </div>

    <div v-else class="content-page__grid">
      <ContentCard
        v-for="item in items"
        :key="item.id"
        :to="getItemRoute(item)"
        :title="getLocalizedValue(item.title)"
        :description="getLocalizedValue(item.description)"
        :thumbnail-url="item.preview_url"
        :level="item.level"
        :duration="getDuration(item.duration)"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { BaseContentItem } from '~/types/content';

interface Props {
  title: string;
  items: BaseContentItem[] | null | undefined;
  pending: boolean;
  error: Error | null | undefined;
  routePrefix: string;
  loadingMessage: string;
  errorMessagePrefix?: string;
  emptyMessage?: string;
  pageTitle?: string;
  pageDescription?: string;
  addNewRoute?: string;
  addNewButtonText?: string;
}

const props = withDefaults(defineProps<Props>(), {
  errorMessagePrefix: '',
  emptyMessage: '',
  pageTitle: '',
  pageDescription: '',
  addNewRoute: '',
  addNewButtonText: 'Добавить',
});

const localePath = useLocalePath();
const { getLocalizedValue, getDuration } = useLocalizedContent();
const { canModerate } = useUserRole();

const showEmptyState = computed(() => {
  return props.emptyMessage && (!props.items || props.items.length === 0);
});

const errorMessage = computed(() => {
  if (!props.error) return '';
  const prefix = props.errorMessagePrefix ? `${props.errorMessagePrefix}: ` : '';
  return `${prefix}${props.error.message}`;
});

function getItemRoute(item: BaseContentItem): string {
  return localePath(`${props.routePrefix}${item.id}`);
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
  border-bottom: 2px solid #e5e7eb;
}

.content-page__title {
  font-size: 32px;
  font-weight: 700;
  margin: 0;
  color: #111827;
}

.content-page__actions {
  display: flex;
  gap: 12px;
  align-items: center;
}
</style>
