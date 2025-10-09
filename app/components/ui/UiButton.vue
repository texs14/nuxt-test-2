<template>
  <NuxtLink v-if="isLink && !isLinkDisabled" :to="linkTarget" :class="buttonClasses">
    <span v-if="loading" class="ui-button__spinner"></span>
    <slot v-else />
  </NuxtLink>

  <span v-else-if="isLink" :class="buttonClasses" role="link" aria-disabled="true" tabindex="-1">
    <span v-if="loading" class="ui-button__spinner"></span>
    <slot v-else />
  </span>

  <button
    v-else
    :type="type"
    :disabled="isDisabled"
    :class="buttonClasses"
    @click="handleButtonClick"
  >
    <span v-if="loading" class="ui-button__spinner"></span>
    <slot v-else />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

type ButtonVariant = 'primary' | 'secondary' | 'google' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface Props {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  block?: boolean;
  type?: 'button' | 'submit' | 'reset';
  to?: string;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  loading: false,
  block: false,
  type: 'button',
  to: undefined,
});

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const isLink = computed(() => Boolean(props.to));
const isDisabled = computed(() => props.disabled || props.loading);
const linkTarget = computed(() => props.to as string);
const isLinkDisabled = computed(() => isLink.value && isDisabled.value);

const buttonClasses = computed(() => {
  return [
    'ui-button',
    `ui-button_${props.variant}`,
    `ui-button_${props.size}`,
    {
      'ui-button_block': props.block,
      'ui-button_loading': props.loading,
      'ui-button_disabled': isDisabled.value,
    },
  ];
});

function handleButtonClick(event: MouseEvent) {
  if (isDisabled.value) {
    return;
  }

  emit('click', event);
}
</script>

<style scoped lang="scss">
.ui-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 0.5rem;
  font-weight: 700;
  text-decoration: none;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow:
    0 1px 3px 0 rgba(0, 0, 0, 0.1),
    0 1px 2px 0 rgba(0, 0, 0, 0.06);

  &:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }

  &_disabled,
  &:disabled,
  &[aria-disabled='true'] {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &_loading {
    cursor: wait;
  }

  &_block {
    width: 100%;
  }

  // Sizes
  &_sm {
    padding: 0.5rem 1rem;
    font-size: 0.75rem;
  }

  &_md {
    padding: 0.625rem 1.25rem;
    font-size: 0.875rem;
  }

  &_lg {
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
  }

  // Variants
  &_primary {
    background: #13a4ec;
    color: white;

    &:hover:not(:disabled):not(.ui-button_loading) {
      background: rgba(19, 164, 236, 0.9);
    }

    &:active:not(:disabled):not(.ui-button_loading) {
      background: rgba(19, 164, 236, 0.8);
    }
  }

  &_secondary {
    background: #6b7280;
    color: white;

    &:hover:not(:disabled):not(.ui-button_loading) {
      background: #4b5563;
    }

    &:active:not(:disabled):not(.ui-button_loading) {
      background: #374151;
    }
  }

  &_google {
    background: white;
    color: #1f2937;
    border: 1px solid #d1d5db;
    box-shadow:
      0 1px 2px 0 rgba(0, 0, 0, 0.05),
      0 1px 3px 0 rgba(0, 0, 0, 0.1);

    &:hover:not(:disabled):not(.ui-button_loading) {
      background: #f9fafb;
      border-color: #9ca3af;
    }

    &:active:not(:disabled):not(.ui-button_loading) {
      background: #f3f4f6;
    }
  }

  &_danger {
    background: #dc2626;
    color: white;

    &:hover:not(:disabled):not(.ui-button_loading) {
      background: #b91c1c;
    }

    &:active:not(:disabled):not(.ui-button_loading) {
      background: #991b1b;
    }
  }

  &_ghost {
    background: transparent;
    color: #13a4ec;
    box-shadow: none;

    &:hover:not(:disabled):not(.ui-button_loading) {
      background: rgba(19, 164, 236, 0.1);
    }

    &:active:not(:disabled):not(.ui-button_loading) {
      background: rgba(19, 164, 236, 0.2);
    }
  }

  &__spinner {
    display: inline-block;
    width: 1em;
    height: 1em;
    border: 2px solid currentColor;
    border-right-color: transparent;
    border-radius: 50%;
    animation: ui-button-spin 0.6s linear infinite;
  }
}

@keyframes ui-button-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
