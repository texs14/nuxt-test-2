<template>
  <Transition name="fade">
    <div v-if="isVisible" class="dictionary-loader" @click.self="handleOverlayClick">
      <div class="dictionary-loader__overlay"></div>
      <div class="dictionary-loader__modal">
        <div class="dictionary-loader__header">
          <h3 class="dictionary-loader__title">
            {{ $t('dictionary.batchProcess.loader.title') }}
          </h3>
        </div>

        <div class="dictionary-loader__content">
          <!-- Прогресс-бар -->
          <div class="dictionary-loader__progress-wrapper">
            <div class="dictionary-loader__progress-bar">
              <div
                class="dictionary-loader__progress-fill"
                :style="{ width: `${percentComplete}%` }"
              ></div>
            </div>
            <div class="dictionary-loader__progress-text">
              {{
                $t('dictionary.batchProcess.loader.percentComplete', { percent: percentComplete })
              }}
            </div>
          </div>

          <!-- Текущее слово -->
          <div v-if="currentWord && !isComplete" class="dictionary-loader__current-word">
            <div class="dictionary-loader__current-label">
              {{ $t('dictionary.batchProcess.loader.currentWord') }}:
            </div>
            <div class="dictionary-loader__current-value">
              {{ currentWord }}
            </div>
          </div>

          <!-- Статистика -->
          <div class="dictionary-loader__stats">
            <div class="dictionary-loader__stat">
              <span class="dictionary-loader__stat-label">
                {{ $t('dictionary.batchProcess.loader.stats.total') }}:
              </span>
              <span class="dictionary-loader__stat-value">{{ totalWords }}</span>
            </div>
            <div class="dictionary-loader__stat">
              <span class="dictionary-loader__stat-label">
                {{ $t('dictionary.batchProcess.loader.stats.processed') }}:
              </span>
              <span class="dictionary-loader__stat-value">{{ processedWords }}</span>
            </div>
            <div class="dictionary-loader__stat dictionary-loader__stat_success">
              <span class="dictionary-loader__stat-label">
                {{ $t('dictionary.batchProcess.loader.stats.added') }}:
              </span>
              <span class="dictionary-loader__stat-value">{{ successCount }}</span>
            </div>
            <div class="dictionary-loader__stat dictionary-loader__stat_info">
              <span class="dictionary-loader__stat-label">
                {{ $t('dictionary.batchProcess.loader.stats.skipped') }}:
              </span>
              <span class="dictionary-loader__stat-value">{{ skipCount }}</span>
            </div>
            <div
              v-if="errorCount > 0"
              class="dictionary-loader__stat dictionary-loader__stat_error"
            >
              <span class="dictionary-loader__stat-label">
                {{ $t('dictionary.batchProcess.loader.stats.errors') }}:
              </span>
              <span class="dictionary-loader__stat-value">{{ errorCount }}</span>
            </div>
          </div>

          <!-- Сообщение о завершении -->
          <div v-if="isComplete" class="dictionary-loader__complete">
            {{ $t('dictionary.batchProcess.loader.complete') }}
          </div>
        </div>

        <div class="dictionary-loader__actions">
          <button
            v-if="!isComplete"
            class="dictionary-loader__button dictionary-loader__button_cancel"
            @click="$emit('cancel')"
          >
            {{ $t('dictionary.batchProcess.loader.cancel') }}
          </button>
          <button
            v-else
            class="dictionary-loader__button dictionary-loader__button_primary"
            @click="$emit('close')"
          >
            {{ $t('dictionary.batchProcess.loader.close') }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
const props = defineProps<{
  isVisible: boolean;
  totalWords: number;
  processedWords: number;
  currentWord: string;
  successCount: number;
  skipCount: number;
  errorCount: number;
  isComplete?: boolean;
}>();

const emit = defineEmits<{
  (e: 'cancel'): void;
  (e: 'close'): void;
}>();

const percentComplete = computed(() => {
  if (props.totalWords === 0) return 0;
  return Math.round((props.processedWords / props.totalWords) * 100);
});

const handleOverlayClick = () => {
  if (props.isComplete) {
    emit('close');
  }
};
</script>

<style scoped lang="scss">
.dictionary-loader {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;

  &__overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
  }

  &__modal {
    position: relative;
    background: #ffffff;
    border-radius: 16px;
    padding: 24px;
    max-width: 480px;
    width: 90%;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    animation: slideUp 0.3s ease;
  }

  &__header {
    margin-bottom: 20px;
  }

  &__title {
    font-size: 20px;
    font-weight: 600;
    color: #111;
    margin: 0;
  }

  &__content {
    margin-bottom: 20px;
  }

  &__progress-wrapper {
    margin-bottom: 20px;
  }

  &__progress-bar {
    width: 100%;
    height: 8px;
    background: #e5e7eb;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 8px;
  }

  &__progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #3b82f6, #2563eb);
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  &__progress-text {
    text-align: center;
    font-size: 14px;
    color: #666;
    font-weight: 500;
  }

  &__current-word {
    background: #f3f4f6;
    padding: 12px;
    border-radius: 8px;
    margin-bottom: 16px;
  }

  &__current-label {
    font-size: 12px;
    color: #666;
    margin-bottom: 4px;
  }

  &__current-value {
    font-size: 18px;
    font-weight: 600;
    color: #111;
  }

  &__stats {
    display: grid;
    gap: 8px;
  }

  &__stat {
    display: flex;
    justify-content: space-between;
    padding: 8px 12px;
    background: #f9fafb;
    border-radius: 6px;
    font-size: 14px;

    &_success {
      background: #f0fdf4;
      color: #166534;
    }

    &_info {
      background: #eff6ff;
      color: #1e40af;
    }

    &_error {
      background: #fef2f2;
      color: #991b1b;
    }
  }

  &__stat-label {
    font-weight: 500;
  }

  &__stat-value {
    font-weight: 600;
  }

  &__complete {
    text-align: center;
    padding: 16px;
    background: #f0fdf4;
    color: #166534;
    border-radius: 8px;
    font-weight: 600;
    font-size: 16px;
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }

  &__button {
    padding: 10px 20px;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;

    &_cancel {
      background: #f3f4f6;
      color: #374151;

      &:hover {
        background: #e5e7eb;
      }
    }

    &_primary {
      background: #3b82f6;
      color: #ffffff;

      &:hover {
        background: #2563eb;
      }
    }
  }
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
