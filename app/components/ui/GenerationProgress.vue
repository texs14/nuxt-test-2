<template>
  <div class="generation-progress">
    <div v-if="!error" class="generation-progress__content">
      <div class="generation-progress__spinner">
        <div class="generation-progress__spinner-circle"></div>
      </div>
      <div class="generation-progress__message">
        {{ progressMessage }}
      </div>
      <div v-if="progress === 'done'" class="generation-progress__success">✅ Готово!</div>
    </div>
    <div v-else class="generation-progress__error">
      <div class="generation-progress__error-icon">⚠️</div>
      <div class="generation-progress__error-message">{{ error }}</div>
      <button
        v-if="canRetry"
        class="generation-progress__retry-btn"
        type="button"
        @click="$emit('retry')"
      >
        Попробовать снова
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  progress: 'generating' | 'synthesizing' | 'saving' | 'done';
  error?: string | null;
  canRetry?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  error: null,
  canRetry: true,
});

defineEmits<{
  (e: 'retry'): void;
}>();

const progressMessage = computed(() => {
  switch (props.progress) {
    case 'generating':
      return '🤖 Генерация перевода и примеров через AI...';
    case 'synthesizing':
      return '🎤 Синтез аудио произношения...';
    case 'saving':
      return '💾 Сохранение в базу данных...';
    case 'done':
      return '✅ Готово!';
    default:
      return 'Обработка...';
  }
});
</script>

<style scoped lang="scss">
.generation-progress {
  min-width: 280px;
  max-width: min(360px, 90vw);
  padding: 24px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.24);
  font-size: 14px;

  &__content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }

  &__spinner {
    width: 48px;
    height: 48px;
    position: relative;
  }

  &__spinner-circle {
    width: 100%;
    height: 100%;
    border: 4px solid rgba(20, 184, 166, 0.2);
    border-top-color: #14b8a6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  &__message {
    color: #333;
    text-align: center;
    font-weight: 500;
    line-height: 1.4;
  }

  &__success {
    color: #14b8a6;
    font-size: 16px;
    font-weight: 600;
  }

  &__error {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  &__error-icon {
    font-size: 48px;
  }

  &__error-message {
    color: #dc2626;
    text-align: center;
    line-height: 1.4;
  }

  &__retry-btn {
    padding: 10px 20px;
    background-color: #14b8a6;
    color: #fff;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover {
      background-color: #0d9488;
    }

    &:active {
      transform: scale(0.98);
    }
  }
}
</style>
