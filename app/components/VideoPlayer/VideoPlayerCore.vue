<template>
  <video
    ref="videoRef"
    class="video-player-core"
    :src="src"
    playsinline
    @timeupdate="$emit('timeupdate', $event)"
    @loadedmetadata="$emit('loadedmetadata', $event)"
    @durationchange="$emit('durationchange', $event)"
    @play="$emit('play', $event)"
    @pause="$emit('pause', $event)"
    @click="$emit('click', $event)"
    @touchend.passive="$emit('touchend', $event)"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  src: string;
}>();

defineEmits<{
  (e: 'timeupdate', event: Event): void;
  (e: 'loadedmetadata', event: Event): void;
  (e: 'durationchange', event: Event): void;
  (e: 'play', event: Event): void;
  (e: 'pause', event: Event): void;
  (e: 'click', event: MouseEvent): void;
  (e: 'touchend', event: TouchEvent): void;
}>();

const videoRef = ref<HTMLVideoElement | null>(null);

defineExpose({
  videoRef,
});
</script>

<style scoped lang="scss">
.video-player-core {
  width: 100%;
  height: 100%;
  display: block;
  background: #000;
  object-fit: contain;
}
</style>
