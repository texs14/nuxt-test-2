<template>
  <button
    :class="['icon-button', `icon-button_${variant}`]"
    :type="type"
    :disabled="disabled"
    :aria-label="ariaLabel"
    @click="$emit('click', $event)"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
defineProps<{
  variant?: 'default' | 'play' | 'nav';
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  ariaLabel?: string;
}>();

defineEmits<{
  (e: 'click', event: MouseEvent): void;
}>();
</script>

<style scoped lang="scss">
.icon-button {
  appearance: none;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(40, 40, 40, 0.7);
  color: #fff;
  padding: 6px 10px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    opacity 0.2s ease,
    background 0.2s ease;

  &:hover:not(:disabled) {
    background: rgba(50, 50, 50, 0.8);
  }

  &:disabled {
    cursor: default;
    opacity: 0.4;
  }

  &_nav {
    background: rgba(30, 30, 30, 0.7);
  }
}
</style>
