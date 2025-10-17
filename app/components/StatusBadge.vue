<template>
  <span :class="badgeClass" class="status-badge">
    {{ statusText }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

interface Props {
  status: 'moderation' | 'approved' | 'rejected';
}

const props = defineProps<Props>();
const { t } = useI18n();

const statusText = computed(() => {
  switch (props.status) {
    case 'moderation':
      return t('videos.status.moderation');
    case 'approved':
      return t('videos.status.approved');
    case 'rejected':
      return t('videos.status.rejected');
    default:
      return props.status;
  }
});

const badgeClass = computed(() => {
  return `status-badge_${props.status}`;
});
</script>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-badge_moderation {
  background: #fef3c7;
  color: #92400e;
}

.status-badge_approved {
  background: #d1fae5;
  color: #065f46;
}

.status-badge_rejected {
  background: #fee2e2;
  color: #991b1b;
}
</style>
