<template>
  <div class="video-card-wrapper">
    <NuxtLink :to="itemRoute" class="content-card">
      <div class="content-card__image-wrapper">
        <div
          v-if="item.preview_url"
          class="content-card__image"
          :style="{ backgroundImage: `url('${item.preview_url}')` }"
        ></div>
        <div class="content-card__overlay">
          <button class="content-card__play-button" type="button">
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
        <div v-if="item.level" class="content-card__level-badge">
          <span :class="getLevelBadgeClass(item.level)">{{ item.level }}</span>
        </div>
        <div v-if="formattedDuration" class="content-card__duration-badge">
          <span class="content-card__duration-text">{{ formattedDuration }}</span>
        </div>
      </div>
      <div class="content-card__info">
        <p class="content-card__title">{{ displayTitle }}</p>
        <p v-if="displayDescription" class="content-card__description">
          {{ displayDescription }}
        </p>
      </div>
    </NuxtLink>
    <div v-if="showActions" class="video-card-wrapper__actions">
      <div v-if="showApprovalButtons" class="video-card-wrapper__status" role="status">
        <StatusBadge :status="currentStatus || 'moderation'" />
        <span class="video-card-wrapper__status-label">{{ moderationLabel }}</span>
      </div>
      <UIButton v-if="showDeleteButtonComputed" variant="danger" size="sm" @click="handleDelete">
        Delete
      </UIButton>
      <UIButton
        v-if="showApprovalButtons"
        class="video-card-wrapper__approve-button"
        variant="success"
        size="sm"
        :loading="isApproving"
        :disabled="isApproving"
        :aria-label="t('videos.addNew.approve')"
        @click="handleApprove"
      >
        {{ isApproving ? t('videos.addNew.approving') : t('videos.addNew.approve') }}
      </UIButton>
      <UIButton
        v-if="showApprovalButtons"
        class="video-card-wrapper__reject-button"
        variant="danger"
        size="sm"
        :loading="isApproving"
        :disabled="isApproving"
        :aria-label="t('videos.status.rejected')"
        @click="handleReject"
      >
        {{ t('videos.status.rejected') }}
      </UIButton>
    </div>
    <p v-if="approvalErrorMessage" class="video-card-wrapper__error" role="alert">
      {{ approvalErrorMessage }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { BaseContentItem } from '~/types/content';
import StatusBadge from '~/components/StatusBadge.vue';
import { useVideoApproval } from '~/composables/video/useVideoApproval';
import { useUserRole } from '~/composables/useUserRole';

interface Props {
  item: BaseContentItem;
  routePrefix: string;
  showDeleteButton?: boolean;
  showApprovalControls?: boolean;
  videoStatus?: 'moderation' | 'approved' | 'rejected' | null;
}

const props = withDefaults(defineProps<Props>(), {
  showDeleteButton: false,
  showApprovalControls: false,
  videoStatus: null,
});

const emit = defineEmits<{
  delete: [item: BaseContentItem];
  approved: [payload: { id: string | number; status: 'approved' }];
  rejected: [payload: { id: string | number; status: 'rejected' }];
}>();

const localePath = useLocalePath();
const { getLocalizedValue, getDuration } = useLocalizedContent();
const { t } = useI18n();
const { canModerate } = useUserRole();

const itemRoute = computed(() => {
  return localePath(`${props.routePrefix}${props.item.id}`);
});

const displayTitle = computed(() => {
  return getLocalizedValue(props.item.title);
});

const displayDescription = computed(() => {
  if (!props.item.description) return '';
  return getLocalizedValue(props.item.description);
});

const formattedDuration = computed(() => {
  if (!props.item.duration) return '';
  return getDuration(props.item.duration);
});

const currentStatus = ref<'moderation' | 'approved' | 'rejected' | null>(props.videoStatus);

watch(
  () => props.videoStatus,
  (status) => {
    currentStatus.value = status ?? null;
  }
);

const {
  approveVideo,
  rejectVideo,
  isApproving,
  approvalError: approvalErrorRef,
  reset: resetApprovalState,
} = useVideoApproval({
  statusRef: currentStatus,
  onApproved: (result) => {
    currentStatus.value = result.status;
    emit('approved', { id: props.item.id, status: 'approved' });
  },
  onRejected: (result) => {
    currentStatus.value = result.status;
    emit('rejected', { id: props.item.id, status: 'rejected' });
  },
});

watch(
  () => props.item.id,
  () => {
    resetApprovalState();
    currentStatus.value = props.videoStatus ?? null;
  }
);

const showDeleteButtonComputed = computed(() => props.showDeleteButton);
const showApprovalControls = computed(() => props.showApprovalControls && canModerate.value);
const showApprovalButtons = computed(
  () => showApprovalControls.value && currentStatus.value === 'moderation'
);
const showActions = computed(() => showDeleteButtonComputed.value || showApprovalButtons.value);

const moderationLabel = computed(() => t('videos.status.moderation'));
const approvalErrorMessage = computed(() => approvalErrorRef.value);

function getLevelBadgeClass(level: string | null): string {
  const baseClass = 'content-card__level-text';
  if (!level) return `${baseClass} ${baseClass}_default`;

  const levelLower = level.toLowerCase();
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
}

function handleDelete() {
  emit('delete', props.item);
}

async function handleApprove() {
  if (!props.item.id) return;
  await approveVideo(String(props.item.id), currentStatus.value ?? undefined);
}

async function handleReject() {
  if (!props.item.id) return;
  await rejectVideo(String(props.item.id), currentStatus.value ?? undefined);
}
</script>

<style lang="scss" scoped>
.video-card-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;

  &__actions {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }

  &__status {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-right: auto;
  }

  &__status-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: #f59e0b;
    text-transform: uppercase;
  }

  &__approve-button {
    min-width: 120px;
  }

  &__reject-button {
    min-width: 120px;
  }

  &__error {
    color: #b91c1c;
    font-size: 0.75rem;
    margin: 0;
    align-self: flex-end;
  }
}

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
