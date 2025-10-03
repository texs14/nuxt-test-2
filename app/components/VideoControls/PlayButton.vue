<template>
  <IconButton
    variant="play"
    :aria-label="playing ? 'Пауза' : 'Старт'"
    @click="$emit('toggle')"
  >
    <PlayIcon v-if="!playing" :size="18" />
    <PauseIcon v-else :size="18" />
  </IconButton>
</template>

<script setup lang="ts">
import IconButton from '~/components/ui/IconButton.vue';
import PlayIcon from '~/components/ui/icons/PlayIcon.vue';
import PauseIcon from '~/components/ui/icons/PauseIcon.vue';

defineProps<{
  playing: boolean;
}>();

defineEmits<{
  (e: 'toggle'): void;
}>();
</script>
