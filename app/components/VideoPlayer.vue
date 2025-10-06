<template>
  <div class="video-player">
    <div
      ref="wrapperRef"
      class="video-player__wrapper"
      @mouseenter="controlsAutoHide.onMouseEnter"
      @mousemove="controlsAutoHide.onMouseMove"
      @mouseleave="controlsAutoHide.onMouseLeave"
      @touchstart.passive="controlsAutoHide.onTouchStart"
    >
      <VideoSubtitle
        :thai-tokens="thaiTokens"
        :thai-text="currentThaiText"
        :secondary-text="currentSelectedText"
        :show-secondary="showSecondary"
      />

      <VideoPlayerCore
        ref="coreRef"
        :src="src"
        @timeupdate="handleTimeUpdate"
        @loadedmetadata="handleLoadedMetadata"
        @durationchange="playback.onDurationChange"
        @play="handlePlay"
        @pause="playback.onPause"
        @click="onVideoToggle"
        @touchend="onVideoToggle"
      />

      <div
        class="video-player__overlay"
        :class="{ 'video-player__overlay_visible': controlsAutoHide.visible.value }"
      >
        <div class="video-player__controls">
          <VideoControls
            :playing="playback.isPlaying.value"
            :current-time="playback.currentTime.value"
            :duration="playback.duration.value"
            :volume="playback.volume.value"
            :hide-timeline="controlsHideTimeline"
            @toggle-play="handleTogglePlay"
            @seek="handleSeek"
            @toggle-fullscreen="fullscreen.toggleFullscreen"
            @set-volume="playback.setVolume"
          />
        </div>
      </div>

      <SubtitleNavigationButtons
        v-if="showNavigationButtons"
        :has-prev="navigation.hasPrev.value"
        :has-next="navigation.hasNext.value"
        :visible="controlsAutoHide.visible.value"
        :restricted-range="!!restrictedRangeData.restrictedRange.value"
        @prev="navigation.goPrev"
        @next="navigation.goNext"
      />
    </div>

    <SubtitleTrack
      :subtitles="normalization.normalizedSubtitles.value"
      :active-index="activeSubtitleData.activeIndex.value"
      :show-all-langs="showAllLangs"
      :locale="selectedLocale"
      @seek-to="navigation.seekTo"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { SubtitleItem, PlaybackRange, Locale } from '~/types/video.types';
import VideoPlayerCore from './VideoPlayer/VideoPlayerCore.vue';
import VideoSubtitle from './VideoPlayer/VideoSubtitle.vue';
import SubtitleNavigationButtons from './VideoPlayer/SubtitleNavigationButtons.vue';
import SubtitleTrack from './VideoPlayer/SubtitleTrack.vue';
import VideoControls from './VideoControls.vue';
import { useSubtitleNormalization } from '~/composables/subtitles/useSubtitleNormalization';
import { getThaiText, getTextForLocale } from '~/composables/subtitles/useSubtitleText';
import { useSubtitleTokenization } from '~/composables/subtitles/useSubtitleTokenization';
import { useActiveSubtitle } from '~/composables/subtitles/useActiveSubtitle';
import { useSubtitleNavigation } from '~/composables/subtitles/useSubtitleNavigation';
import { useVideoPlayback } from '~/composables/video/useVideoPlayback';
import { useRestrictedRange } from '~/composables/video/useRestrictedRange';
import { useFullscreen } from '~/composables/video/useFullscreen';
import { useVideoKeyboard } from '~/composables/video/useVideoKeyboard';
import { useAutoHide } from '~/composables/shared/useAutoHide';

const props = defineProps<{
  src: string;
  subtitles?: SubtitleItem[] | null;
  lang?: Locale;
  showAllLangs?: boolean;
  restrictedRange?: PlaybackRange | null;
  hideTimeline?: boolean;
  hideNavigationButtons?: boolean;
}>();

const emit = defineEmits<{
  (e: 'ready'): void;
}>();

// Refs
const wrapperRef = ref<HTMLElement | null>(null);
const coreRef = ref<InstanceType<typeof VideoPlayerCore> | null>(null);
const videoRef = computed(() => coreRef.value?.videoRef || null);

// Locale
const { locale } = useI18n();
const selectedLocale = computed<Locale>(() => {
  if (props.lang) return props.lang;
  if (locale.value === 'ru' || locale.value === 'en') return locale.value as Locale;
  return 'ru';
});
const showAllLangs = computed(() => !!props.showAllLangs);
const showNavigationButtons = computed(() => {
  if (props.hideNavigationButtons) return false;
  return normalization.normalizedSubtitles.value.length > 0;
});

// Composables
const playback = useVideoPlayback(videoRef);
const restrictedRangeData = useRestrictedRange(
  videoRef,
  computed(() => props.restrictedRange),
  playback.currentTime,
  playback.isPlaying
);
const normalization = useSubtitleNormalization(computed(() => props.subtitles));
const activeSubtitleData = useActiveSubtitle(
  normalization.normalizedSubtitles,
  playback.currentTime
);
const navigation = useSubtitleNavigation(
  videoRef,
  normalization.normalizedSubtitles,
  activeSubtitleData.activeIndex,
  playback.currentTime,
  activeSubtitleData.lastSubtitle,
  restrictedRangeData.restrictedRange,
  restrictedRangeData.rangeEnded
);
const fullscreen = useFullscreen(wrapperRef);
const controlsAutoHide = useAutoHide(false, 3000);

// Subtitle text logic
const activeThaiText = computed(() =>
  activeSubtitleData.activeSubtitle.value
    ? getThaiText(activeSubtitleData.activeSubtitle.value)
    : ''
);
const lastThaiText = computed(() =>
  activeSubtitleData.lastSubtitle.value ? getThaiText(activeSubtitleData.lastSubtitle.value) : ''
);
const currentThaiText = computed(() => activeThaiText.value || lastThaiText.value);

const activeSelectedText = computed(() =>
  activeSubtitleData.activeSubtitle.value
    ? getTextForLocale(activeSubtitleData.activeSubtitle.value, selectedLocale.value)
    : ''
);
const lastSelectedText = computed(() =>
  activeSubtitleData.lastSubtitle.value
    ? getTextForLocale(activeSubtitleData.lastSubtitle.value, selectedLocale.value)
    : ''
);
const currentSelectedText = computed(() => {
  if (selectedLocale.value === 'th') return '';
  return activeSelectedText.value || lastSelectedText.value;
});

const showSecondary = computed(() => selectedLocale.value !== 'th');

// Tokenization
const activeThaiSentences = computed(() => {
  const subtitle = activeSubtitleData.activeSubtitle.value;
  if (!subtitle) return [];
  const th = subtitle.text?.th;
  if (!th) return [];
  if (typeof th === 'object' && 'sentences' in th) return th.sentences ?? [];
  return [String(th).trim()].filter(Boolean).map((value) => value.split(/\s+/u).filter(Boolean));
});

const lastThaiSentences = computed(() => {
  const subtitle = activeSubtitleData.lastSubtitle.value;
  if (!subtitle) return [];
  const th = subtitle.text?.th;
  if (!th) return [];
  if (typeof th === 'object' && 'sentences' in th) return th.sentences ?? [];
  return [String(th).trim()].filter(Boolean).map((value) => value.split(/\s+/u).filter(Boolean));
});

const currentThaiSentences = computed(() =>
  activeThaiSentences.value.length ? activeThaiSentences.value : lastThaiSentences.value
);

const tokenization = useSubtitleTokenization(currentThaiSentences, currentThaiText);
const thaiTokens = tokenization.tokens;

// UI state
const controlsHideTimeline = computed(
  () => props.hideTimeline ?? !!restrictedRangeData.restrictedRange.value
);

// Event handlers
const handleTimeUpdate = (e: Event) => {
  const el = e.target as HTMLVideoElement;
  const restricted = restrictedRangeData.handleRangeRestriction(el);
  if (!restricted) {
    playback.currentTime.value = el.currentTime;
  }
};

const handleLoadedMetadata = () => {
  playback.onLoadedMetadata();
  // Сообщаем что видео плеер готов
  emit('ready');
};

const handlePlay = () => {
  const el = videoRef.value;
  if (el) {
    restrictedRangeData.handlePlayWithRange(el);
  }
  playback.onPlay();
};

const handleTogglePlay = () => {
  const el = videoRef.value;
  if (!el) return;
  if (el.paused) {
    restrictedRangeData.handlePlayWithRange(el);
  }
  playback.togglePlay();
  controlsAutoHide.show();
};

const handleSeek = (time: number) => {
  const clampedTime = restrictedRangeData.clampToRange(time);
  playback.seekToTime(clampedTime);
};

let lastToggleAt = 0;
const onVideoToggle = () => {
  const now = Date.now();
  if (now - lastToggleAt < 250) return;
  lastToggleAt = now;
  handleTogglePlay();
};

// Keyboard
useVideoKeyboard({
  onSpace: () => {
    handleTogglePlay();
  },
});

// Watchers
watch(
  () => props.subtitles,
  () => {
    if (videoRef.value) playback.currentTime.value = videoRef.value.currentTime || 0;
    activeSubtitleData.lastSubtitle.value = null;
  }
);
</script>

<style scoped lang="scss">
.video-player {
  &__wrapper {
    position: relative;
    width: 100%;
    background: #000;
    border-radius: 12px;
    overflow: hidden;
    aspect-ratio: 16/9;
  }

  &__overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.25s ease;

    &_visible {
      opacity: 1;
    }
  }

  &__controls {
    display: flex;
    gap: 8px;
    position: absolute;
    right: 0;
    left: 0;
    bottom: 0;
    pointer-events: auto;
    z-index: 9999;
  }
}
</style>
