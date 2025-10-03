<template>
  <IconButton
    aria-label="На весь экран"
    @click="$emit('toggle')"
  >
    <FullscreenIcon :size="18" />
  </IconButton>
</template>

<script setup lang="ts">
import IconButton from '~/components/ui/IconButton.vue';
import FullscreenIcon from '~/components/ui/icons/FullscreenIcon.vue';

defineEmits<{
  (e: 'toggle'): void;
}>();
</script>
