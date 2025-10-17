<template>
  <div v-if="!restrictedRange">
    <IconButton
      :class="[
        'subtitle-nav-btn',
        'subtitle-nav-btn_prev',
        { 'subtitle-nav-btn_visible': visible },
      ]"
      variant="nav"
      :disabled="!hasPrev"
      aria-label="Назад по субтитрам"
      @click="$emit('prev')"
    >
      <ChevronLeftIcon :size="20" />
    </IconButton>
    <IconButton
      :class="[
        'subtitle-nav-btn',
        'subtitle-nav-btn_next',
        { 'subtitle-nav-btn_visible': visible },
      ]"
      variant="nav"
      :disabled="!hasNext"
      aria-label="Вперёд по субтитрам"
      @click="$emit('next')"
    >
      <ChevronRightIcon :size="20" />
    </IconButton>
  </div>
</template>

<script setup lang="ts">
import IconButton from '~/components/ui/IconButton.vue';
import ChevronLeftIcon from '~/components/ui/icons/ChevronLeftIcon.vue';
import ChevronRightIcon from '~/components/ui/icons/ChevronRightIcon.vue';

defineProps<{
  hasPrev: boolean;
  hasNext: boolean;
  visible: boolean;
  restrictedRange: boolean;
}>();

defineEmits<{
  (e: 'prev'): void;
  (e: 'next'): void;
}>();
</script>

<style scoped lang="scss">
.subtitle-nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;

  &_prev {
    left: 8px;
  }

  &_next {
    right: 8px;
  }

  &_visible {
    opacity: 1;
    pointer-events: auto;
  }

  &:disabled.subtitle-nav-btn_visible {
    opacity: 0.4;
  }
}
</style>
