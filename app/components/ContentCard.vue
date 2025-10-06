<template>
  <NuxtLink :to="to" class="content-card">
    <div v-if="thumbnailUrl" class="content-card__preview">
      <img :src="thumbnailUrl" :alt="title" class="content-card__img" />
    </div>
    <div class="content-card__content">
      <h3 class="content-card__title">{{ title }}</h3>
      <p v-if="description" class="content-card__description">{{ description }}</p>
      <div class="content-card__meta">
        <span v-if="level" class="content-card__badge content-card__badge_level">{{ level }}</span>
        <span v-if="duration" class="content-card__badge content-card__badge_duration">
          {{ duration }}
        </span>
      </div>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
defineProps<{
  to: string;
  title: string;
  description?: string;
  thumbnailUrl?: string | null;
  level?: string | null;
  duration?: string;
}>();
</script>

<style scoped lang="scss">
.content-card {
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

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  }

  &__preview {
    width: 100%;
    aspect-ratio: 16/9;
    background: #f3f4f6;
    overflow: hidden;
  }

  &__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__content {
    padding: 16px;
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  &__title {
    font-size: 18px;
    font-weight: 600;
    margin: 0 0 8px;
    color: #111827;
  }

  &__description {
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

  &__meta {
    display: flex;
    gap: 12px;
    font-size: 12px;
  }

  &__badge {
    padding: 4px 8px;
    border-radius: 4px;
    font-weight: 600;

    &_level {
      background: #dbeafe;
      color: #1e40af;
    }

    &_duration {
      background: #f3f4f6;
      color: #374151;
    }
  }
}
</style>
