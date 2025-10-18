<template>
  <button
    type="button"
    class="translate-button"
    :class="[
      `translate-button_size_${size}`,
      { 'translate-button_loading': loading, 'translate-button_disabled': disabled },
    ]"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <span v-if="loading" class="translate-button__spinner"></span>
    <span v-else class="translate-button__icon">🌐</span>
    <span class="translate-button__text">
      <slot>{{ loading ? loadingText : text }}</slot>
    </span>
  </button>
</template>

<script setup lang="ts">
interface Props {
  loading?: boolean;
  disabled?: boolean;
  size?: 'small' | 'normal';
  text?: string;
  loadingText?: string;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  disabled: false,
  size: 'normal',
  text: 'Перевести',
  loadingText: 'Перевод...',
});

const emit = defineEmits<{
  (e: 'click'): void;
}>();

function handleClick() {
  if (!props.disabled && !props.loading) {
    emit('click');
  }
}
</script>

<style lang="scss" scoped>
.translate-button {
  appearance: none;
  border: 1px solid #ddd;
  background: #f6f6f6;
  border-radius: 8px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  transition: all 0.2s ease;

  &:hover:not(&_disabled):not(&_loading) {
    background: #e8e8e8;
    border-color: #ccc;
  }

  &_size {
    &_small {
      padding: 4px 8px;
      font-size: 11px;
    }

    &_normal {
      padding: 6px 12px;
      font-size: 12px;
    }
  }

  &_loading {
    cursor: wait;
    opacity: 0.8;
  }

  &_disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
}

.translate-button__icon {
  display: inline-flex;
  align-items: center;
  font-size: 14px;
}

.translate-button__text {
  white-space: nowrap;
}

.translate-button__spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-top-color: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
