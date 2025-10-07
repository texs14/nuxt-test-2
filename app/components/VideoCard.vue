<template>
  <div class="video-card">
    <NuxtLink v-if="videoLink" :to="videoLink" class="video-card__main">
      <div class="video-card__thumb">
        <img
          :src="thumbnailUrl || defaultThumb"
          :alt="`${displayTitle} preview`"
          class="video-card__thumb_image"
        />
        <span class="video-card__level">{{ level }}</span>
      </div>
      <div class="video-card__body">
        <h3 class="video-card__title">{{ displayTitle }}</h3>
      </div>
    </NuxtLink>
    <NuxtLink v-if="editLink !== '#'" :to="editLink" class="video-card__edit" @click.stop>
      {{ t('videos.edit') }}
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
type Title = Record<string, string | undefined>;

const props = defineProps<{
  id: string | number;
  title?: Title | string | Record<string, any> | null;
  level?: string | null;
  thumbnailUrl?: string | null;
}>();

const defaultThumb = '/favicon.ico';

const { locale } = useI18n();
const displayTitle = computed(() => {
  if (!props.title) return '';
  if (typeof props.title === 'string') return props.title;
  const map = props.title as Title;
  const code = locale.value as 'ru' | 'en' | 'th';
  return map?.[code] ?? map?.en ?? map?.ru ?? map?.th ?? '';
});

const { t } = useI18n();
const safeLocalePath = useSafeLocalePath();
const { canModerate } = useUserRole();

const videoLink = computed(() => {
  const link = safeLocalePath({ name: 'videos-id', params: { id: props.id } });
  return link === '#' ? null : link;
});

const editLink = computed(() => {
  if (!canModerate.value) return '#';
  return safeLocalePath({ name: 'videos-add-new', query: { editId: String(props.id) } });
});
</script>

<style lang="scss" scoped>
.video-card {
  position: relative;

  &__main {
    display: block;
    text-decoration: none;
    color: inherit;
  }

  &__thumb {
    position: relative;
    aspect-ratio: 16 / 9;
    border-radius: 12px;
    overflow: hidden;
    background: #f2f2f2;

    &_image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
  }

  &__level {
    position: absolute;
    bottom: 8px;
    left: 8px;
    background: rgba(0, 0, 0, 0.65);
    color: #fff;
    font-size: 12px;
    padding: 4px 8px;
    border-radius: 8px;
  }

  &__body {
    padding-top: 8px;
  }

  &__title {
    font-size: 16px;
    font-weight: 600;
    margin: 0;
  }

  &__edit {
    position: absolute;
    top: 8px;
    right: 8px;
    background: rgba(0, 0, 0, 0.7);
    color: #fff;
    padding: 6px 10px;
    font-size: 12px;
    border-radius: 8px;
    text-decoration: none;
    transition: background 0.2s ease;

    &:hover {
      background: rgba(0, 0, 0, 0.9);
    }
  }
}
</style>
