<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="delete-confirmation-modal" @click.self="handleOverlayClick">
        <div class="delete-confirmation-modal__overlay"></div>
        <div class="delete-confirmation-modal__container">
          <div class="delete-confirmation-modal__dialog">
            <div class="delete-confirmation-modal__header">
              <h2 class="delete-confirmation-modal__title">{{ title }}</h2>
              <button
                v-if="!loading"
                type="button"
                class="delete-confirmation-modal__close"
                @click="handleCancel"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div class="delete-confirmation-modal__body">
              <p class="delete-confirmation-modal__message">{{ message }}</p>
            </div>

            <div class="delete-confirmation-modal__footer">
              <UIButton variant="secondary" size="md" :disabled="loading" @click="handleCancel">
                {{ cancelText }}
              </UIButton>
              <UIButton
                variant="danger"
                size="md"
                :loading="loading"
                :disabled="loading"
                @click="handleConfirm"
              >
                {{ confirmText }}
              </UIButton>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * DeleteConfirmationModal Component
 *
 * A reusable confirmation modal for permanent deletion actions.
 * Custom implementation with Teleport for reliable rendering.
 *
 * @example
 * ```vue
 * <DeleteConfirmationModal
 *   v-model:open="showModal"
 *   title="Delete Video"
 *   message="Are you sure you want to delete this video? This action cannot be undone."
 *   :loading="isDeleting"
 *   @confirm="handleDelete"
 *   @cancel="showModal = false"
 * />
 * ```
 */

interface Props {
  /** Modal header title */
  title: string;
  /** Confirmation message body */
  message: string;
  /** Confirm button text */
  confirmText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Loading state for async operations */
  loading?: boolean;
  /** Controls modal open state */
  open?: boolean;
  /** Allow dismissing by clicking overlay */
  dismissible?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  confirmText: 'Delete',
  cancelText: 'Cancel',
  loading: false,
  open: false,
  dismissible: true,
});

const emit = defineEmits<{
  /** Emitted when confirm button is clicked */
  confirm: [];
  /** Emitted when cancel button is clicked or modal is dismissed */
  cancel: [];
  /** Update open state (v-model:open) */
  'update:open': [value: boolean];
}>();

function handleConfirm() {
  if (!props.loading) {
    emit('confirm');
  }
}

function handleCancel() {
  if (!props.loading) {
    emit('update:open', false);
    emit('cancel');
  }
}

function handleOverlayClick() {
  if (props.dismissible && !props.loading) {
    handleCancel();
  }
}
</script>

<style scoped lang="scss">
.delete-confirmation-modal {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;

  &__overlay {
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: -1;
  }

  &__container {
    position: relative;
    width: 100%;
    max-width: 32rem;
    z-index: 1;
  }

  &__dialog {
    background-color: white;
    border-radius: 0.5rem;
    box-shadow:
      0 20px 25px -5px rgba(0, 0, 0, 0.1),
      0 10px 10px -5px rgba(0, 0, 0, 0.04);
    display: flex;
    flex-direction: column;
    max-height: calc(100vh - 2rem);
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem;
    border-bottom: 1px solid #e5e7eb;
  }

  &__title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #111827;
    margin: 0;
  }

  &__close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: none;
    background: none;
    color: #6b7280;
    cursor: pointer;
    border-radius: 0.25rem;
    transition: all 0.15s ease;

    &:hover {
      background-color: #f3f4f6;
      color: #111827;
    }

    &:focus {
      outline: 2px solid #3b82f6;
      outline-offset: 2px;
    }
  }

  &__body {
    padding: 1.5rem;
    flex: 1;
    overflow-y: auto;
  }

  &__message {
    color: #374151;
    font-size: 0.875rem;
    line-height: 1.5;
    margin: 0;
  }

  &__footer {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
    padding: 1.5rem;
    border-top: 1px solid #e5e7eb;
  }
}

// Dark mode support
:global(.dark) .delete-confirmation-modal {
  &__dialog {
    background-color: #1f2937;
  }

  &__header,
  &__footer {
    border-color: #374151;
  }

  &__title {
    color: #f9fafb;
  }

  &__message {
    color: #d1d5db;
  }

  &__close {
    color: #9ca3af;

    &:hover {
      background-color: #374151;
      color: #f9fafb;
    }
  }
}

// Transition animations
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;

  .delete-confirmation-modal__overlay {
    transition: opacity 0.2s ease;
  }

  .delete-confirmation-modal__dialog {
    transition: all 0.2s ease;
  }
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;

  .delete-confirmation-modal__dialog {
    transform: scale(0.95);
  }
}
</style>
