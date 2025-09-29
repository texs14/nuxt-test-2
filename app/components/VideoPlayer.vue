<!-- eslint-disable import/order -->
<template>
  <div class="video-player">
    <div
      ref="wrapperRef"
      class="video-player__wrapper"
      @mouseenter="onMouseEnter"
      @mousemove="onMouseMove"
      @mouseleave="onMouseLeave"
      @touchstart.passive="onTouchStart"
    >
      <div v-if="hasAnySubtitle" class="video-player__subtitle">
        <div class="video-player__subtitle_line video-player__subtitle_line-primary">
          <template v-if="thaiTokens.length">
            <span
              v-for="token in thaiTokens"
              :key="token.id"
              :class="[
                'video-player__word-wrapper',
                token.type === 'word'
                  ? 'video-player__word-wrapper_word'
                  : 'video-player__word-wrapper_separator',
              ]"
            >
              <InteractiveWord
                v-if="token.type === 'word'"
                :word="token.value"
                class="video-player__word"
              />
              <span v-else class="video-player__token">{{ token.value }}</span>
            </span>
          </template>
          <template v-else>
            {{ currentThaiText }}
          </template>
        </div>
        <div
          v-if="showSecondary"
          class="video-player__subtitle_line video-player__subtitle_line-secondary"
        >
          {{ currentSelectedText }}
        </div>
      </div>
      <video
        ref="videoRef"
        class="video-player__video"
        :src="src"
        playsinline
        @timeupdate="onTimeUpdate"
        @loadedmetadata="onLoadedMetadata"
        @durationchange="onDurationChange"
        @play="onPlay"
        @click="onVideoToggle"
        @touchend.passive="onVideoToggle"
      />

      <div
        class="video-player__overlay"
        :class="{ 'video-player__overlay_visible': controlsVisible }"
      >
        <div class="video-player__controls">
          <VideoControls
            :playing="isPlaying"
            :current-time="currentTime"
            :duration="duration"
            :volume="volume"
            :hide-timeline="controlsHideTimeline"
            @toggle-play="togglePlay"
            @seek="seekToTime"
            @toggle-fullscreen="toggleFullscreen"
            @set-volume="setVolume"
          />
        </div>
      </div>

      <button
        v-if="!restrictedRange"
        :class="[
          'video-player__btn',
          'video-player__btn_prev',
          { 'video-player__btn_visible': controlsVisible },
        ]"
        :disabled="!hasPrev"
        aria-label="Назад по субтитрам"
        @click="goPrev"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M15 6L9 12L15 18"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
      <button
        v-if="!restrictedRange"
        :class="[
          'video-player__btn',
          'video-player__btn_next',
          { 'video-player__btn_visible': controlsVisible },
        ]"
        :disabled="!hasNext"
        aria-label="Вперёд по субтитрам"
        @click="goNext"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M9 6L15 12L9 18"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>

    <div v-if="normalizedSubtitles.length" class="video-player__track">
      <div
        v-for="(subtitle, index) in normalizedSubtitles"
        :key="subtitle.id ?? index"
        class="video-player__cue"
        :class="{ 'video-player__cue_active': index === activeIndex }"
        @click="seekTo(index)"
      >
        <span class="video-player__cue_time">
          {{ formatTime(subtitle.start) }}–{{ formatTime(subtitle.end) }}
        </span>
        <span v-if="!showAllLangs" class="video-player__cue_text">
          <span class="video-player__cue_text-th">{{ getThaiText(subtitle) }}</span>
          <span v-if="getSelectedText(subtitle)" class="video-player__cue_text-selected">
            — {{ getSelectedText(subtitle) }}
          </span>
        </span>
        <div v-else class="video-player__cue_text video-player__cue_text_all">
          <span class="video-player__cue_text-th">{{ getThaiText(subtitle) }}</span>
          <span v-if="getTextForLocale(subtitle, 'ru')" class="video-player__cue_text_ru">
            {{ getTextForLocale(subtitle, 'ru') }}
          </span>
          <span v-if="getTextForLocale(subtitle, 'en')" class="video-player__cue_text_en">
            {{ getTextForLocale(subtitle, 'en') }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import InteractiveWord from './ui/InteractiveWord.vue';
import VideoControls from './VideoControls.vue';

type ThaiSentences = { sentences: string[][] };

interface SubtitleText {
  th?: string | ThaiSentences;
  en?: string;
  ru?: string;
  [key: string]: string | ThaiSentences | undefined;
}

interface SubtitleItem {
  id?: number | string;
  start: number;
  end: number;
  text?: SubtitleText | string;
}

interface NormalizedSubtitle {
  id: number | string;
  start: number;
  end: number;
  text: SubtitleText;
}

type SubtitleSource = SubtitleItem | NormalizedSubtitle;

type Token =
  | {
      id: string;
      value: string;
      type: 'word';
    }
  | {
      id: string;
      value: string;
      type: 'separator';
    };

interface PlaybackRange {
  start: number;
  end: number;
}

const props = defineProps<{
  src: string;
  subtitles?: SubtitleItem[] | null;
  lang?: 'ru' | 'en' | 'th';
  showAllLangs?: boolean;
  restrictedRange?: PlaybackRange | null;
  hideTimeline?: boolean;
}>();

const { locale } = useI18n();
const selectedLocale = computed<'ru' | 'en' | 'th'>(() => {
  if (props.lang) return props.lang;
  if (locale.value === 'ru' || locale.value === 'en') return locale.value as 'ru' | 'en';
  return 'ru';
});
const showAllLangs = computed(() => !!props.showAllLangs);

const videoRef = ref<HTMLVideoElement | null>(null);
const currentTime = ref(0);
const duration = ref(0);
const isPlaying = ref(false);
const volume = ref(1);

const restrictedRange = computed<PlaybackRange | null>(() => {
  const range = props.restrictedRange;
  if (!range) return null;
  const start = Number(range.start);
  const end = Number(range.end);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  const normalizedStart = Math.max(0, start);
  const normalizedEnd = Math.max(0, end);
  if (normalizedEnd <= normalizedStart) return null;
  return { start: normalizedStart, end: normalizedEnd };
});

const controlsHideTimeline = computed(() => props.hideTimeline ?? !!restrictedRange.value);

const RANGE_EPSILON = 0.05;
const rangeEnded = ref(false);
const controlsVisible = ref(false);
let hideTimer: number | null = null;

const showControls = () => {
  controlsVisible.value = true;
  if (hideTimer) {
    window.clearTimeout(hideTimer);
    hideTimer = null;
  }
};

const scheduleHide = (ms: number) => {
  if (hideTimer) window.clearTimeout(hideTimer);
  hideTimer = window.setTimeout(() => {
    controlsVisible.value = false;
    hideTimer = null;
  }, ms);
};

const normalizedSubtitles = computed<NormalizedSubtitle[]>(() => {
  const list = (props.subtitles ?? [])
    .filter((item: any): item is SubtitleItem => Boolean(item))
    .map((subtitle: any) => {
      const text: SubtitleText =
        typeof subtitle.text === 'string' ? { ru: subtitle.text } : (subtitle.text ?? {});

      return {
        id: subtitle.id ?? Math.random().toString(36).slice(2),
        start: Number(subtitle.start) || 0,
        end: Number(subtitle.end) || 0,
        text,
      } satisfies NormalizedSubtitle;
    })
    .sort((a: any, b: any) => a.start - b.start);

  return list;
});

const activeIndex = computed(() => {
  const t = currentTime.value;
  return normalizedSubtitles.value.findIndex((s: any) => t >= s.start && t < s.end);
});

const activeSubtitle = computed(() => normalizedSubtitles.value[activeIndex.value] || null);

const getTextForLocale = (s: SubtitleSource, code: 'ru' | 'en' | 'th') => {
  if (code === 'th') return getThaiText(s);
  if (typeof s.text === 'string') return s.text;
  const value = s.text?.[code];
  return typeof value === 'string' ? value : '';
};
const isThaiSentences = (value: any): value is ThaiSentences =>
  value && typeof value === 'object' && Array.isArray(value.sentences);

const getThaiText = (s: SubtitleSource) => {
  if (typeof s.text === 'string') return s.text;
  const th = s.text?.th;
  if (!th) return '';
  if (isThaiSentences(th)) {
    return th.sentences
      .map((sentence) => sentence.filter(Boolean).join(' '))
      .filter(Boolean)
      .join(' ');
  }
  return th;
};

const getThaiSentences = (s: SubtitleSource): string[][] => {
  if (typeof s.text === 'string') return [[s.text]];
  const th = s.text?.th;
  if (!th) return [];
  if (isThaiSentences(th)) return th.sentences ?? [];
  return [String(th).trim()].filter(Boolean).map((value) => value.split(/\s+/u).filter(Boolean));
};

const getSelectedText = (s: SubtitleSource) => {
  if (selectedLocale.value === 'th') return '';
  return getTextForLocale(s, selectedLocale.value);
};

const activeThaiText = computed(() =>
  activeSubtitle.value ? getThaiText(activeSubtitle.value) : ''
);
const activeThaiSentences = computed(() =>
  activeSubtitle.value ? getThaiSentences(activeSubtitle.value) : []
);
const activeSelectedText = computed(() =>
  activeSubtitle.value ? getTextForLocale(activeSubtitle.value, selectedLocale.value) : ''
);

// Запоминаем последний показанный субтитр, чтобы не пропадал между паузами
const lastSubtitle = ref<NormalizedSubtitle | null>(null);
watch(activeSubtitle, (val: any) => {
  if (val) lastSubtitle.value = val;
});

const lastThaiText = computed(() => (lastSubtitle.value ? getThaiText(lastSubtitle.value) : ''));
const lastThaiSentences = computed(() =>
  lastSubtitle.value ? getThaiSentences(lastSubtitle.value) : []
);
const lastSelectedText = computed(() =>
  lastSubtitle.value ? getTextForLocale(lastSubtitle.value, selectedLocale.value) : ''
);

const currentThaiText = computed(() => activeThaiText.value || lastThaiText.value);
const currentThaiSentences = computed(() =>
  activeThaiSentences.value.length ? activeThaiSentences.value : lastThaiSentences.value
);
const currentSelectedText = computed(() => {
  if (selectedLocale.value === 'th') return '';
  return activeSelectedText.value || lastSelectedText.value;
});

const hasAnySubtitle = computed(() => Boolean(currentThaiText.value || currentSelectedText.value));
const showSecondary = computed(() => selectedLocale.value !== 'th');

const thaiTokens = computed<Token[]>(() => {
  const sentences = currentThaiSentences.value;
  if (sentences.length) {
    const tokens: Token[] = [];
    sentences.forEach((sentence: string[], sentenceIndex: number) => {
      const filtered = sentence.filter((word) => Boolean(word && word.trim().length));
      filtered.forEach((word: string, wordIndex: number) => {
        const trimmed = word.trim();
        if (!trimmed) return;
        tokens.push({
          id: `sentence-${sentenceIndex}-word-${wordIndex}`,
          value: trimmed,
          type: 'word',
        });
      });
      if (sentenceIndex < sentences.length - 1) {
        tokens.push({
          id: `sentence-separator-${sentenceIndex}`,
          value: '',
          type: 'separator',
        });
      }
    });
    if (tokens.length) return tokens;
  }

  const text = currentThaiText.value;
  if (!text) return [];

  const fallbackParts = text.match(/(\p{L}+|\p{N}+|\s+|[^\p{L}\p{N}\s]+)/gu) ?? [text];
  return fallbackParts.map((value: any, idx: any) => ({
    id: `fallback-${idx}`,
    value,
    type: /\s+/u.test(value) ? 'separator' : 'word',
  }));
});

const hasPrev = computed(() => {
  const subs = normalizedSubtitles.value;
  if (!subs.length) return false;
  const idx = activeIndex.value;
  if (idx > 0) return true;
  const first = subs[0];
  const last = subs[subs.length - 1];
  // РџРѕСЃР»Рµ РїРѕСЃР»РµРґРЅРµРіРѕ СЃСѓР±С‚РёС‚СЂР° РєРЅРѕРїРєР° Р°РєС‚РёРІРЅР°, С‡С‚РѕР±С‹ РІРµСЂРЅСѓС‚СЊСЃСЏ Рє РµРіРѕ РЅР°С‡Р°Р»Сѓ
  if (last && currentTime.value >= last.end) return true;
  // Р’Рѕ РІСЂРµРјСЏ РїРµСЂРІРѕРіРѕ СЃСѓР±С‚РёС‚СЂР° вЂ” Р°РєС‚РёРІРЅР°, РµСЃР»Рё СѓР¶Рµ РїСЂРѕС€С‘Р» РµРіРѕ СЃС‚Р°СЂС‚
  if (idx === 0 && first && currentTime.value > first.start) return true;
  // Р’ РїСЂРѕРјРµР¶СѓС‚РєР°С… РјРµР¶РґСѓ СЃСѓР±С‚РёС‚СЂР°РјРё вЂ” Р°РєС‚РёРІРЅР°, РµСЃР»Рё РµСЃС‚СЊ РїРѕСЃР»РµРґРЅРёР№ РїРѕРєР°Р·Р°РЅРЅС‹Р№
  if (idx === -1 && lastSubtitle.value) return true;
  return false;
});
const hasNext = computed(() => {
  const subs = normalizedSubtitles.value;
  const last = subs[subs.length - 1];
  if (!last) return false;
  // Р”Рѕ СЃС‚Р°СЂС‚Р° РїРѕСЃР»РµРґРЅРµРіРѕ СЃСѓР±С‚РёС‚СЂР° вЂ” РјРѕР¶РЅРѕ РІРїРµСЂС‘Рґ; РЅР°С‡РёРЅР°СЏ СЃ РЅРµРіРѕ Рё РїРѕР·Р¶Рµ вЂ” РЅРµР»СЊР·СЏ
  return currentTime.value < last.start;
});

const playWithCatch = (element: HTMLVideoElement) => {
  const promise = element.play();
  promise?.catch(() => undefined);
};

const clampToRange = (time: number) => {
  const range = restrictedRange.value;
  if (!range) return time;
  if (time < range.start) return range.start;
  if (time > range.end) return range.end;
  return time;
};

const seekTo = (index: number) => {
  const el = videoRef.value;
  const s = normalizedSubtitles.value[index];
  if (!el || !s) return;
  const wasPlaying = !el.paused;
  const target = clampToRange(Math.max(s.start + 0.01, 0));
  el.currentTime = target;
  if (restrictedRange.value) rangeEnded.value = false;
  if (wasPlaying) {
    playWithCatch(el);
  } else {
    el.pause();
  }
};

const seekToTime = (time: number) => {
  const el = videoRef.value;
  if (!el) return;
  const wasPlaying = !el.paused;
  const durationLimit = el.duration || Number.MAX_SAFE_INTEGER;
  const limited = Math.max(0, Math.min(time, durationLimit));
  const target = clampToRange(limited);
  el.currentTime = target;
  if (restrictedRange.value) rangeEnded.value = false;
  if (wasPlaying) playWithCatch(el);
  else el.pause();
};

const goPrev = () => {
  const el = videoRef.value;
  if (!el) return;
  const idx = activeIndex.value;
  if (idx >= 0) {
    const s = normalizedSubtitles.value[idx];
    if (!s) return;
    const elapsed = currentTime.value - s.start;
    // Р•СЃР»Рё РїСЂРѕС€Р»Рѕ Р±РѕР»СЊС€Рµ 1.5 СЃРµРєСѓРЅРґ СЃ РЅР°С‡Р°Р»Р° СЃСѓР±С‚РёС‚СЂР° вЂ” РїРµСЂРµРєР»СЋС‡Р°РµРјСЃСЏ РЅР° РЅРµРіРѕ
    if (elapsed > 1.5) {
      const wasPlaying = !el.paused;
      el.currentTime = Math.max(s.start + 0.01, 0);
      if (wasPlaying) {
        playWithCatch(el);
      } else {
        el.pause();
      }
    } else {
      const prevIndex = idx - 1;
      if (prevIndex >= 0) {
        seekTo(prevIndex);
      } else {
        // РќРµС‚ РїСЂРµРґС‹РґСѓС‰РµРіРѕ вЂ” РѕСЃС‚Р°С‘РјСЃСЏ РЅР° РїРµСЂРІРѕРј Рё РїРµСЂРµР·Р°РїСѓСЃРєР°РµРј РµРіРѕ
        const first = normalizedSubtitles.value[0];
        if (first) {
          const wasPlaying = !el.paused;
          el.currentTime = Math.max(first.start + 0.01, 0);
          if (wasPlaying) {
            playWithCatch(el);
          } else {
            el.pause();
          }
        }
      }
    }
  } else {
    // Р’РЅРµ Р°РєС‚РёРІРЅРѕРіРѕ СЃСѓР±С‚РёС‚СЂР°
    const subs = normalizedSubtitles.value;
    if (!subs.length) return;
    const last = subs[subs.length - 1];
    const first = subs[0];
    if (!last || !first) return;
    if (currentTime.value >= last.end) {
      const wasPlaying = !el.paused;
      el.currentTime = Math.max(last.start + 0.01, 0);
      if (wasPlaying) {
        playWithCatch(el);
      } else {
        el.pause();
      }
    } else if (currentTime.value < first.start) {
      seekTo(0);
    } else {
      const ls = lastSubtitle.value;
      if (ls) {
        const wasPlaying = !el.paused;
        el.currentTime = Math.max(ls.start + 0.01, 0);
        if (wasPlaying) {
          playWithCatch(el);
        } else {
          el.pause();
        }
      }
    }
  }
};

const goNext = () => {
  if (!hasNext.value) return;
  seekTo(activeIndex.value + 1);
};

const onTimeUpdate = (e: Event) => {
  const el = e.target as HTMLVideoElement;
  if (restrictedRange.value) {
    const { start, end } = restrictedRange.value;
    if (el.currentTime < start - RANGE_EPSILON) {
      el.currentTime = start;
      currentTime.value = start;
      rangeEnded.value = false;
      return;
    }
    if (el.currentTime >= end - RANGE_EPSILON) {
      el.currentTime = end;
      currentTime.value = end;
      if (!el.paused) el.pause();
      rangeEnded.value = true;
      return;
    }
  }
  currentTime.value = el.currentTime;
};

const onLoadedMetadata = () => {
  const el = videoRef.value;
  if (!el) return;
  duration.value = Number.isFinite(el.duration) ? el.duration : 0;
  volume.value = el.volume;
};

const onDurationChange = () => {
  const el = videoRef.value;
  if (!el) return;
  duration.value = Number.isFinite(el.duration) ? el.duration : 0;
};

const onPlay = () => {
  const el = videoRef.value;
  if (el && restrictedRange.value) {
    const { start, end } = restrictedRange.value;
    if (rangeEnded.value || el.currentTime < start || el.currentTime >= end) {
      el.currentTime = start;
      rangeEnded.value = false;
    }
  }
  isPlaying.value = true;
};
const onPause = () => {
  isPlaying.value = false;
};

const togglePlay = () => {
  const el = videoRef.value;
  if (!el) return;
  if (el.paused) {
    if (restrictedRange.value) {
      const { start, end } = restrictedRange.value;
      if (rangeEnded.value || el.currentTime < start || el.currentTime >= end) {
        el.currentTime = start;
        rangeEnded.value = false;
      }
    }
    playWithCatch(el);
  } else el.pause();
};

const setVolume = (v: number) => {
  const el = videoRef.value;
  if (!el) return;
  el.volume = Math.max(0, Math.min(1, v));
  volume.value = el.volume;
};

const wrapperRef = ref<HTMLElement | null>(null);
const isFullscreen = ref(false);

const toggleFullscreen = async () => {
  const wrapper = wrapperRef.value || videoRef.value?.parentElement;
  if (!wrapper) return;
  try {
    if (!document.fullscreenElement) {
      await wrapper.requestFullscreen?.();
    } else {
      await document.exitFullscreen?.();
    }
  } catch {
    // ignore
  }
};

const onFsChange = () => {
  isFullscreen.value = !!document.fullscreenElement;
};

let lastToggleAt = 0;
const onVideoToggle = () => {
  const now = Date.now();
  if (now - lastToggleAt < 250) return;
  lastToggleAt = now;
  togglePlay();
  showControls();
};

const onKeyDown = (e: KeyboardEvent) => {
  if (e.code === 'Space') {
    const target = e.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
    )
      return;
    e.preventDefault();
    togglePlay();
    showControls();
  }
};

onMounted(() => {
  document.addEventListener('fullscreenchange', onFsChange);
  window.addEventListener('keydown', onKeyDown);
  // РќР°С‡Р°Р»СЊРЅРѕРµ Р·РЅР°С‡РµРЅРёРµ
  if (videoRef.value) {
    duration.value = Number.isFinite(videoRef.value.duration) ? videoRef.value.duration : 0;
    volume.value = videoRef.value.volume;
  }
});

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', onFsChange);
  window.removeEventListener('keydown', onKeyDown);
  if (hideTimer) window.clearTimeout(hideTimer);
});

const onMouseEnter = () => {
  showControls();
};
const onMouseMove = () => {
  showControls();
};
const onMouseLeave = () => {
  scheduleHide(3000);
};
const onTouchStart = () => {
  showControls();
  scheduleHide(5000);
};

const formatTime = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
};

watch(
  () => props.subtitles,
  () => {
    // СЃР±СЂРѕСЃ Р°РєС‚РёРІРЅРѕРіРѕ СЃРѕСЃС‚РѕСЏРЅРёСЏ РїСЂРё СЃРјРµРЅРµ СЃСѓР±С‚РёС‚СЂРѕРІ
    if (videoRef.value) currentTime.value = videoRef.value.currentTime || 0;
    lastSubtitle.value = null;
  }
);

watch(restrictedRange, (range) => {
  const el = videoRef.value;
  rangeEnded.value = false;
  if (!el || !range) return;
  el.currentTime = range.start;
  el.pause();
  isPlaying.value = false;
});
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

  &__word-wrapper_separator {
    margin: 0 4px;
  }

  &__video {
    width: 100%;
    height: 100%;
    display: block;
    background: #000;
    object-fit: contain;
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
  }

  &__btn {
    appearance: none;
    border: 1px solid rgba(255, 255, 255, 0.25);
    background: rgba(30, 30, 30, 0.7);
    color: #fff;
    padding: 6px 8px;
    border-radius: 8px;
    cursor: pointer;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;

    &_prev {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      left: 8px;
    }
    &_next {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      right: 8px;
    }

    &_visible {
      opacity: 1;
      pointer-events: auto;
    }

    &:disabled {
      cursor: default;
    }
    &.video-player__btn_visible:disabled {
      opacity: 0.4;
    }
  }

  &__subtitle {
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
  }
  &__subtitle_line {
    display: block;
  }
  &__subtitle_line-primary {
    font-weight: 600;
  }
  &__subtitle_line-secondary {
    opacity: 0.9;
    margin-top: 4px;
  }
  &__track {
    margin-top: 12px;
    display: grid;
    grid-template-columns: 1fr;
    gap: 6px;
  }

  &__cue {
    display: grid;
    grid-template-columns: 96px 1fr;
    gap: 10px;
    align-items: baseline;
    padding: 8px 10px;
    border-radius: 8px;
    background: #f6f6f6;
    cursor: pointer;
    transition: background 0.2s ease;

    &_active {
      background: #e9f2ff;
    }
  }

  &__cue_time {
    color: #666;
    font-variant-numeric: tabular-nums;
  }
  &__cue_text {
    color: #111;
  }
  &__cue_text-th {
    font-weight: 600;
  }
  &__cue_text-selected {
    opacity: 0.9;
  }
  &__cue_text_all {
    display: grid;
    gap: 2px;
  }
  &__cue_text_ru {
    opacity: 0.95;
  }
  &__cue_text_en {
    opacity: 0.95;
  }
}
</style>
