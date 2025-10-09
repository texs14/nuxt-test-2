<template>
  <NuxtLink :to="to" class="content-card">
    <div class="content-card__image-wrapper">
      <div
        v-if="thumbnailUrl"
        class="content-card__image"
        :style="{ backgroundImage: `url('${thumbnailUrl}')` }"
      ></div>
      <div class="content-card__overlay">
        <button class="content-card__play-button">
          <svg
            class="h-8 w-8 ml-1"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              clip-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
              fill-rule="evenodd"
            ></path>
          </svg>
        </button>
      </div>
      <div v-if="level" class="content-card__level-badge">
        <span :class="getLevelBadgeClass">{{ level }}</span>
      </div>
      <div v-if="formattedDuration" class="content-card__duration-badge">
        <span class="content-card__duration-text">{{ formattedDuration }}</span>
      </div>
    </div>
    <div class="content-card__info">
      <p class="content-card__title">{{ title }}</p>
      <p v-if="description" class="content-card__description">{{ description }}</p>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  to: string;
  title: string;
  description?: string;
  thumbnailUrl?: string | null;
  level?: string | null;
  duration?: string;
}>();

const getLevelBadgeClass = computed(() => {
  const baseClass = 'content-card__level-text';

  if (!props.level) {
    return `${baseClass} ${baseClass}_default`;
  }

  const levelLower = props.level.toLowerCase();

  if (levelLower.includes('beginner') || levelLower.includes('начинающий')) {
    return `${baseClass} ${baseClass}_beginner`;
  }

  if (levelLower.includes('intermediate') || levelLower.includes('средний')) {
    return `${baseClass} ${baseClass}_intermediate`;
  }

  if (levelLower.includes('advanced') || levelLower.includes('продвинутый')) {
    return `${baseClass} ${baseClass}_advanced`;
  }

  return `${baseClass} ${baseClass}_default`;
});

const formattedDuration = computed(() => {
  const raw = props.duration?.trim();

  if (!raw) return '';

  const pad = (value: number) => value.toString().padStart(2, '0');

  const formatFromSeconds = (totalSeconds: number) => {
    if (!Number.isFinite(totalSeconds)) return raw;

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }

    return `${pad(minutes)}:${pad(seconds)}`;
  };

  if (/^\d+$/.test(raw)) {
    return formatFromSeconds(Number.parseInt(raw, 10));
  }

  const segments = raw.split(':');
  const numbers = segments.map((segment) => Number.parseInt(segment, 10));

  if (numbers.some((num) => Number.isNaN(num))) {
    return raw;
  }

  if (numbers.length === 3) {
    const hours = numbers[0];
    const minutes = numbers[1];
    const seconds = numbers[2];

    if (hours === undefined || minutes === undefined || seconds === undefined) {
      return raw;
    }

    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }

    return `${pad(minutes)}:${pad(seconds)}`;
  }

  if (numbers.length === 2) {
    const minutes = numbers[0];
    const seconds = numbers[1];

    if (minutes === undefined || seconds === undefined) {
      return raw;
    }

    return `${pad(minutes)}:${pad(seconds)}`;
  }

  if (numbers.length === 1) {
    const seconds = numbers[0];

    if (seconds === undefined) {
      return raw;
    }

    return formatFromSeconds(seconds);
  }

  return raw;
});
</script>

<style scoped lang="scss">
.content-card {
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: inherit;

  &:hover {
    .content-card__overlay {
      opacity: 1;
    }

    .content-card__title {
      color: #13a4ec;
    }
  }

  &__image-wrapper {
    position: relative;
  }

  &__image {
    width: 100%;
    aspect-ratio: 16/9;
    background-size: cover;
    background-position: center;
    border-radius: 0.5rem;
    box-shadow:
      0 4px 6px -1px rgba(0, 0, 0, 0.1),
      0 2px 4px -1px rgba(0, 0, 0, 0.06);
  }

  &__overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 0.5rem;
    opacity: 0;
    transition: opacity 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__play-button {
    width: 3.5rem;
    height: 3.5rem;
    background: rgba(19, 164, 236, 0.8);
    color: white;
    border-radius: 9999px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    cursor: pointer;
  }

  &__level-badge {
    position: absolute;
    top: 0.75rem;
    left: 0.75rem;
  }

  &__level-text {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    font-weight: 600;
    border-radius: 9999px;

    &_beginner,
    &_default {
      color: #22543d;
      background-color: #c6f6d5;
    }

    &_intermediate {
      color: #9c4221;
      background-color: #feebc8;
    }

    &_advanced {
      color: #9b2c2c;
      background-color: #fed7d7;
    }
  }

  &__duration-badge {
    position: absolute;
    bottom: 0.75rem;
    right: 0.75rem;
  }

  &__duration-text {
    padding: 0.5rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: white;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 0.375rem;
  }

  &__info {
    padding-top: 0.75rem;
  }

  &__title {
    font-weight: 600;
    color: #1e293b;
    transition: color 0.2s ease;
    margin: 0;
  }

  &__description {
    font-size: 0.875rem;
    color: #64748b;
    margin: 0.25rem 0 0;
  }
}

:global(.dark) .content-card {
  &__title {
    color: #f1f5f9;

    &:hover {
      color: #13a4ec;
    }
  }

  &__description {
    color: #94a3b8;
  }
}
</style>
