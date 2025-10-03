<template>
  <div
    class="volume-control"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <IconButton
      aria-label="Громкость"
      @click="toggle"
    >
      <VolumeIcon :size="18" />
    </IconButton>
    <div
      class="volume-control__popup"
      :class="{ 'volume-control__popup_visible': visible }"
    >
      <input
        class="volume-control__slider"
        type="range"
        min="0"
        max="1"
        step="0.01"
        :value="volume"
        aria-label="Громкость"
        @input="onInput"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import IconButton from '~/components/ui/IconButton.vue';
import VolumeIcon from '~/components/ui/icons/VolumeIcon.vue';
import { usePopupVisibility } from '~/composables/controls/usePopupVisibility';

defineProps<{
  volume: number;
}>();

const emit = defineEmits<{
  (e: 'set-volume', value: number): void;
}>();

const { visible, toggle, onMouseEnter, onMouseLeave } = usePopupVisibility(1000, 6000);

const onInput = (e: Event) => {
  const target = e.target as HTMLInputElement | null;
  if (!target) return;
  const v = Number(target.value);
  emit('set-volume', isNaN(v) ? 0 : v);
};
</script>

<style scoped lang="scss">
.volume-control {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 36px;

  &__popup {
    position: absolute;
    bottom: 44px;
    left: 50%;
    transform: translateX(-50%);
    padding: 10px;
    border-radius: 10px;
    background: rgba(22, 22, 22, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.2);
    backdrop-filter: saturate(140%) blur(6px);
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;
    z-index: 5;
    width: 56px;
    height: 180px;
    display: grid;
    place-items: center;

    &_visible {
      opacity: 1;
      pointer-events: auto;
    }
  }

  &__slider {
    transform: rotate(-90deg) translateY(-265%);
    width: 160px;
    height: 20px;
  }
}
</style>
