<template>
  <div class="exercise-video">
    <div class="exercise-video__wrapper">
      <video
        ref="videoRef"
        class="exercise-video__element"
        :src="src"
        @timeupdate="handleTimeUpdate"
        @ended="handleVideoEnded"
        @loadedmetadata="handleLoadedMetadata"
      />

      <div v-if="showButtons" class="exercise-video__buttons">
        <button class="exercise-video__button" type="button" @click="playNormal">
          {{ t('clickExercise.playAgain') }}
        </button>
        <button
          class="exercise-video__button exercise-video__button_slow"
          type="button"
          @click="playSlow"
        >
          {{ t('clickExercise.playSlowly') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

interface PlaybackRange {
  start: number;
  end: number;
}

const props = defineProps<{
  src: string;
  range: PlaybackRange | null;
}>();

const emit = defineEmits<{
  (e: 'fragment-ended'): void;
}>();

const { t } = useI18n();
const videoRef = ref<HTMLVideoElement | null>(null);
const showButtons = ref(false);
const isReady = ref(false);

const handleLoadedMetadata = () => {
  isReady.value = true;
  if (props.range) {
    playFragment();
  }
};

const handleTimeUpdate = () => {
  const video = videoRef.value;
  if (!video || !props.range) return;

  if (video.currentTime >= props.range.end) {
    video.pause();
    showButtons.value = true;
    emit('fragment-ended');
  }
};

const handleVideoEnded = () => {
  showButtons.value = true;
  emit('fragment-ended');
};

const playFragment = async () => {
  const video = videoRef.value;
  if (!video || !props.range) return;

  showButtons.value = false;
  video.currentTime = props.range.start;
  video.playbackRate = 1;

  try {
    await video.play();
  } catch {
    // Игнорируем ошибки воспроизведения
  }
};

const playNormal = async () => {
  const video = videoRef.value;
  if (!video || !props.range) return;

  showButtons.value = false;
  video.currentTime = props.range.start;
  video.playbackRate = 1;

  try {
    await video.play();
  } catch {
    // Игнорируем ошибки воспроизведения
  }
};

const playSlow = async () => {
  const video = videoRef.value;
  if (!video || !props.range) return;

  showButtons.value = false;
  video.currentTime = props.range.start;
  video.playbackRate = 0.6;

  try {
    await video.play();
  } catch {
    // Игнорируем ошибки воспроизведения
  }
};

watch(
  () => props.range,
  (newRange) => {
    if (newRange && isReady.value) {
      playFragment();
    }
  }
);

onMounted(() => {
  if (videoRef.value && videoRef.value.readyState >= 1) {
    handleLoadedMetadata();
  }
});
</script>

<style scoped lang="scss">
.exercise-video {
  &__wrapper {
    position: relative;
    width: 100%;
    background: #000;
    border-radius: 12px;
    overflow: hidden;
    aspect-ratio: 16/9;
  }

  &__element {
    width: 100%;
    height: 100%;
    display: block;
  }

  &__buttons {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    gap: 16px;
    z-index: 10;
  }

  &__button {
    padding: 12px 24px;
    border: none;
    border-radius: 10px;
    background: rgba(37, 99, 235, 0.95);
    color: #fff;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);

    &:hover {
      background: rgba(37, 99, 235, 1);
      transform: scale(1.05);
    }

    &:active {
      transform: scale(0.98);
    }

    &_slow {
      background: rgba(234, 179, 8, 0.95);

      &:hover {
        background: rgba(234, 179, 8, 1);
      }
    }
  }
}
</style>
