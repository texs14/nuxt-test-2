<template>
  <div v-if="hasAnySubtitle" class="video-subtitle">
    <div class="video-subtitle__line video-subtitle__line-primary">
      <template v-if="thaiTokens.length">
        <span
          v-for="token in thaiTokens"
          :key="token.id"
          :class="[
            'video-subtitle__word-wrapper',
            token.type === 'word'
              ? 'video-subtitle__word-wrapper_word'
              : 'video-subtitle__word-wrapper_separator',
          ]"
        >
          <InteractiveWord
            v-if="token.type === 'word'"
            :word="token.value"
            class="video-subtitle__word"
          />
          <span v-else class="video-subtitle__token">{{ token.value }}</span>
        </span>
      </template>
      <template v-else>
        {{ thaiText }}
      </template>
    </div>
    <div v-if="showSecondary" class="video-subtitle__line video-subtitle__line-secondary">
      {{ secondaryText }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Token } from '~/types/video.types';
import InteractiveWord from '~/components/InteractiveWord.vue';

const props = defineProps<{
  thaiTokens: Token[];
  thaiText: string;
  secondaryText: string;
  showSecondary: boolean;
}>();

const hasAnySubtitle = computed(() => Boolean(props.thaiText || props.secondaryText));
</script>

<style scoped lang="scss">
.video-subtitle {
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.65);
  color: #fff;
  max-width: 90%;
  text-align: center;
  font-size: 16px;
  line-height: 1.35;

  position: absolute;
  bottom: 27%;
  left: 50%;
  z-index: 999;
  transform: translateX(-50%);
  width: 100%;

  &__line {
    display: block;
  }

  &__line-primary {
    font-weight: 600;
  }

  &__line-secondary {
    opacity: 0.9;
    margin-top: 4px;
  }

  &__word-wrapper_separator {
    margin: 0 4px;
  }
}
</style>
