<template>
  <div class="word-card-slider">
    <div class="word-card-slider__header">
      <h3 class="word-card-slider__title">{{ title }}</h3>
      <div class="word-card-slider__controls">
        <button
          :aria-label="ariaLabelPrev"
          :disabled="currentIndex === 0"
          class="word-card-slider__btn"
          type="button"
          @click="prev"
        >
          ‹
        </button>
        <span class="word-card-slider__pager"> {{ currentIndex + 1 }}/{{ items.length }} </span>
        <button
          :aria-label="ariaLabelNext"
          :disabled="currentIndex === items.length - 1"
          class="word-card-slider__btn"
          type="button"
          @click="next"
        >
          ›
        </button>
      </div>
    </div>
    <div class="word-card-slider__container">
      <div ref="sliderTrack" class="word-card-slider__track" @scroll="handleScroll">
        <div v-for="(item, index) in items" :key="`slide-${index}`" class="word-card-slider__item">
          <slot name="item" :item="item" :index="index">
            {{ item }}
          </slot>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  items: {
    type: Array,
    required: true,
  },
  ariaLabelPrev: {
    type: String,
    required: true,
  },
  ariaLabelNext: {
    type: String,
    required: true,
  },
});

const sliderTrack = ref<HTMLElement | null>(null);
const currentIndex = ref(0);
let scrollTimeout: NodeJS.Timeout | null = null;

const updateSliderHeight = (index: number) => {
  if (!sliderTrack.value || !sliderTrack.value.children[index]) return;
  const currentSlide = sliderTrack.value.children[index] as HTMLElement;
  const container = sliderTrack.value.parentElement;
  if (container) {
    container.style.transition = 'height 0.3s ease';
    container.style.height = `${currentSlide.offsetHeight}px`;
  }
};

const scrollToSlide = (index: number) => {
  if (!sliderTrack.value) return;
  const slideWidth = sliderTrack.value.children[0]?.clientWidth || 0;
  const gap = parseInt(getComputedStyle(sliderTrack.value).gap) || 0;
  sliderTrack.value.scrollTo({
    left: index * (slideWidth + gap),
    behavior: 'smooth',
  });
  updateSliderHeight(index);
};

const prev = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--;
    scrollToSlide(currentIndex.value);
  }
};

const next = () => {
  if (currentIndex.value < props.items.length - 1) {
    currentIndex.value++;
    scrollToSlide(currentIndex.value);
  }
};

const handleScroll = () => {
  if (!sliderTrack.value) return;
  if (scrollTimeout) clearTimeout(scrollTimeout);

  scrollTimeout = setTimeout(() => {
    if (!sliderTrack.value) return;
    const slideWidth = sliderTrack.value.children[0]?.clientWidth || 0;
    const gap = parseInt(getComputedStyle(sliderTrack.value).gap) || 0;
    const newIndex = Math.round(sliderTrack.value.scrollLeft / (slideWidth + gap));
    currentIndex.value = newIndex;
    updateSliderHeight(newIndex);
  }, 150);
};

const updateHeight = () => {
  updateSliderHeight(currentIndex.value);
};

onMounted(() => {
  nextTick(() => {
    updateHeight();
    window.addEventListener('resize', updateHeight);
  });
});

onUnmounted(() => {
  window.removeEventListener('resize', updateHeight);
  if (scrollTimeout) clearTimeout(scrollTimeout);
});

defineExpose({
  updateHeight,
});
</script>

<style scoped lang="scss">
.word-card-slider {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &__title {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 700;
    color: #111827;
  }

  &__controls {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  &__btn {
    padding: 0;
    background: transparent;
    border: none;
    color: #6b7280;
    font-size: 1.5rem;
    cursor: pointer;
    border-radius: 50%;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s;

    &:hover:not(:disabled) {
      color: #111827;
    }

    &:focus {
      outline: none;
      box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.3);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &__pager {
    font-size: 0.875rem;
    color: #6b7280;
  }

  &__container {
    overflow: hidden;
    position: relative;
  }

  &__track {
    display: flex;
    overflow-x: auto;
    gap: 1rem;
    scroll-snap-type: x mandatory;
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
    align-items: flex-start;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  &__item {
    flex-shrink: 0;
    width: 100%;
    scroll-snap-align: start;
    box-sizing: border-box;
    min-height: fit-content;
  }
}
</style>
