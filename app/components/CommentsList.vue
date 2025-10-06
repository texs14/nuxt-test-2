<template>
  <section class="comments-list">
    <h2 class="comments-list__title">{{ title }}</h2>

    <div v-if="loading" class="comments-list__state">
      {{ loadingText }}
    </div>
    <div v-else-if="error" class="comments-list__state comments-list__state_error">
      {{ errorText }}
    </div>
    <div v-else-if="!comments || comments.length === 0" class="comments-list__state">
      {{ emptyText }}
    </div>

    <ul v-else class="comments-list__items">
      <li v-for="comment in comments" :key="comment.id" class="comments-list__item">
        <div class="comments-list__item-header">
          <strong class="comments-list__item-author">
            {{ comment.author || anonymousText }}
          </strong>
          <time v-if="comment.created_at" class="comments-list__item-time">
            {{ formatDate(comment.created_at) }}
          </time>
        </div>
        <p class="comments-list__item-text">{{ comment.text || comment.content }}</p>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
interface Comment {
  id: string | number;
  text?: string | null;
  content?: string | null;
  author?: string | null;
  created_at?: string | null;
  profiles?: {
    username?: string;
  };
}

defineProps<{
  title: string;
  comments?: Comment[];
  loading?: boolean;
  error?: boolean;
  loadingText?: string;
  errorText?: string;
  emptyText?: string;
  anonymousText?: string;
}>();

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
</script>

<style scoped lang="scss">
.comments-list {
  margin-top: 32px;

  &__title {
    font-size: 20px;
    font-weight: 600;
    margin: 0 0 16px;
    color: #111827;
  }

  &__state {
    text-align: center;
    padding: 20px;
    color: #6b7280;

    &_error {
      color: #dc2626;
    }
  }

  &__items {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  &__item {
    padding: 16px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: white;
  }

  &__item-header {
    display: flex;
    gap: 8px;
    align-items: baseline;
    margin-bottom: 8px;
  }

  &__item-author {
    font-weight: 600;
    color: #111827;
  }

  &__item-time {
    color: #9ca3af;
    font-size: 12px;
  }

  &__item-text {
    margin: 0;
    line-height: 1.5;
    color: #374151;
  }
}
</style>
