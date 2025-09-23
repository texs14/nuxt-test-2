<template>
  <div class="video-player">
    <div
      class="video-player__wrapper"
      ref="wrapperRef"
      @mouseenter="onMouseEnter"
      @mousemove="onMouseMove"
      @mouseleave="onMouseLeave"
      @touchstart.passive="onTouchStart"
    >
      <video
        ref="videoRef"
        class="video-player__video"
        :src="src"
        playsinline
        @timeupdate="onTimeUpdate"
        @loadedmetadata="onLoadedMetadata"
        @durationchange="onDurationChange"
        @play="onPlay"
        @pause="onPause"
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
            :currentTime="currentTime"
            :duration="duration"
            :volume="volume"
            @toggle-play="togglePlay"
            @seek="seekToTime"
            @toggle-fullscreen="toggleFullscreen"
            @set-volume="setVolume"
          />
        </div>
      </div>

      <div class="video-player__subtitle" v-if="hasAnySubtitle">
        <div class="video-player__subtitle_line video-player__subtitle_line-primary">{{ activeThaiText }}</div>
        <div v-if="showSecondary" class="video-player__subtitle_line video-player__subtitle_line-secondary">{{ activeSelectedText }}</div>
      </div>

      <button :class="['video-player__btn', 'video-player__btn_prev', { 'video-player__btn_visible': controlsVisible }]" :disabled="!hasPrev" @click="goPrev" aria-label="Назад по субтитрам">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 6L9 12L15 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <button :class="['video-player__btn', 'video-player__btn_next', { 'video-player__btn_visible': controlsVisible }]" :disabled="!hasNext" @click="goNext" aria-label="Вперёд по субтитрам">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 6L15 12L9 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>

    <div class="video-player__track" v-if="normalizedSubtitles.length">
      <div
        v-for="(s, i) in normalizedSubtitles"
        :key="s.id ?? i"
        class="video-player__cue"
        :class="{ 'video-player__cue_active': i === activeIndex }"
        @click="seekTo(i)"
      >
        <span class="video-player__cue_time">{{ formatTime(s.start) }}–{{ formatTime(s.end) }}</span>
        <span v-if="!showAllLangs" class="video-player__cue_text">
          <span class="video-player__cue_text-th">{{ getThaiText(s) }}</span>
          <span v-if="getSelectedText(s)" class="video-player__cue_text-selected"> — {{ getSelectedText(s) }}</span>
        </span>
        <div v-else class="video-player__cue_text video-player__cue_text_all">
          <span class="video-player__cue_text-th">{{ getThaiText(s) }}</span>
          <span v-if="getTextForLocale(s, 'ru')" class="video-player__cue_text_ru">{{ getTextForLocale(s, 'ru') }}</span>
          <span v-if="getTextForLocale(s, 'en')" class="video-player__cue_text_en">{{ getTextForLocale(s, 'en') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import VideoControls from './VideoControls.vue'

interface SubtitleText { th?: string; en?: string; ru?: string }
interface SubtitleItem { id?: number|string; start: number; end: number; text?: SubtitleText | string }

const props = defineProps<{ src: string; subtitles?: SubtitleItem[] | null; lang?: 'ru'|'en'|'th'; showAllLangs?: boolean }>()

const { locale } = useI18n()
const selectedLocale = computed<'ru'|'en'|'th'>(() => props.lang ?? ((locale.value === 'ru' || locale.value === 'en') ? (locale.value as 'ru'|'en') : 'ru'))
const showAllLangs = computed(() => !!props.showAllLangs)

const videoRef = ref<HTMLVideoElement | null>(null)
const currentTime = ref(0)
const duration = ref(0)
const isPlaying = ref(false)
const volume = ref(1)

const controlsVisible = ref(false)
let hideTimer: number | null = null

const showControls = () => {
  controlsVisible.value = true
  if (hideTimer) {
    window.clearTimeout(hideTimer)
    hideTimer = null
  }
}

const scheduleHide = (ms: number) => {
  if (hideTimer) window.clearTimeout(hideTimer)
  hideTimer = window.setTimeout(() => {
    controlsVisible.value = false
    hideTimer = null
  }, ms)
}

const normalizedSubtitles = computed<Required<SubtitleItem>[]>(() => {
  const list = (props.subtitles || [])
    .filter(Boolean)
    .map((s) => ({
      id: s.id ?? Math.random().toString(36).slice(2),
      start: Number(s.start) || 0,
      end: Number(s.end) || 0,
      text: typeof s.text === 'string' ? { ru: s.text } : (s.text || {})
    }))
    .sort((a, b) => a.start - b.start)
  return list as any
})

const activeIndex = computed(() => {
  const t = currentTime.value
  return normalizedSubtitles.value.findIndex(s => t >= s.start && t < s.end)
})

const activeSubtitle = computed(() => normalizedSubtitles.value[activeIndex.value] || null)

const getTextForLocale = (s: SubtitleItem, code: 'ru'|'en'|'th') => {
  if (typeof s.text === 'string') return s.text
  return s.text?.[code] || ''
}
const getThaiText = (s: SubtitleItem) => {
  if (typeof s.text === 'string') return s.text
  return s.text?.th || ''
}

const getSelectedText = (s: SubtitleItem) => {
  if (selectedLocale.value === 'th') return ''
  return getTextForLocale(s, selectedLocale.value)
}

const activeThaiText = computed(() => activeSubtitle.value ? getThaiText(activeSubtitle.value) : '')
const activeSelectedText = computed(() => activeSubtitle.value ? getTextForLocale(activeSubtitle.value, selectedLocale.value) : '')

// Запоминаем последний показываемый субтитр, чтобы не пропадал между паузами
const lastSubtitle = ref<SubtitleItem | null>(null)
watch(activeSubtitle, (val) => {
  if (val) lastSubtitle.value = val
})

const lastThaiText = computed(() => lastSubtitle.value ? getThaiText(lastSubtitle.value) : '')
const lastSelectedText = computed(() => lastSubtitle.value ? getTextForLocale(lastSubtitle.value, selectedLocale.value) : '')

const hasAnySubtitle = computed(() => !!(activeThaiText.value || lastThaiText.value || activeSelectedText.value || lastSelectedText.value))
const showSecondary = computed(() => selectedLocale.value !== 'th')

const hasPrev = computed(() => {
  const subs = normalizedSubtitles.value
  if (!subs.length) return false
  const idx = activeIndex.value
  if (idx > 0) return true
  const first = subs[0]
  const last = subs[subs.length - 1]
  // После последнего субтитра кнопка активна, чтобы вернуться к его началу
  if (last && currentTime.value >= last.end) return true
  // Во время первого субтитра — активна, если уже прошёл его старт
  if (idx === 0 && first && currentTime.value > first.start) return true
  // В промежутках между субтитрами — активна, если есть последний показанный
  if (idx === -1 && lastSubtitle.value) return true
  return false
})
const hasNext = computed(() => {
  const subs = normalizedSubtitles.value
  const last = subs[subs.length - 1]
  if (!last) return false
  // До старта последнего субтитра — можно вперёд; начиная с него и позже — нельзя
  return currentTime.value < last.start
})

const seekTo = (index: number) => {
  const el = videoRef.value
  const s = normalizedSubtitles.value[index]
  if (!el || !s) return
  const wasPlaying = !el.paused
  el.currentTime = Math.max(s.start + 0.01, 0)
  if (wasPlaying) { void el.play()?.catch(() => {}) } else { el.pause() }
}

const seekToTime = (time: number) => {
  const el = videoRef.value
  if (!el) return
  const wasPlaying = !el.paused
  el.currentTime = Math.max(0, Math.min(time, el.duration || Number.MAX_SAFE_INTEGER))
  if (wasPlaying) { void el.play()?.catch(() => {}) } else { el.pause() }
}

const goPrev = () => {
  const el = videoRef.value
  if (!el) return
  const idx = activeIndex.value
  if (idx >= 0) {
    const s = normalizedSubtitles.value[idx]
    if (!s) return
    const elapsed = currentTime.value - s.start
    // Если прошло больше 1.5 секунд с начала субтитра — переключаемся на него
    if (elapsed > 1.5) {
      const wasPlaying = !el.paused
      el.currentTime = Math.max(s.start + 0.01, 0)
      if (wasPlaying) { void el.play()?.catch(() => {}) } else { el.pause() }
    } else {
      const prevIndex = idx - 1
      if (prevIndex >= 0) {
        seekTo(prevIndex)
      } else {
        // Нет предыдущего — остаёмся на первом и перезапускаем его
        const first = normalizedSubtitles.value[0]
        if (first) {
          const wasPlaying = !el.paused
          el.currentTime = Math.max(first.start + 0.01, 0)
          if (wasPlaying) { void el.play()?.catch(() => {}) } else { el.pause() }
        }
      }
    }
  } else {
    // Вне активного субтитра
    const subs = normalizedSubtitles.value
    if (!subs.length) return
    const last = subs[subs.length - 1]
    const first = subs[0]
    if (!last || !first) return
    if (currentTime.value >= last.end) {
      const wasPlaying = !el.paused
      el.currentTime = Math.max(last.start + 0.01, 0)
      if (wasPlaying) { void el.play()?.catch(() => {}) } else { el.pause() }
    } else if (currentTime.value < first.start) {
      seekTo(0)
    } else {
      const ls = lastSubtitle.value
      if (ls) {
        const wasPlaying = !el.paused
        el.currentTime = Math.max(ls.start + 0.01, 0)
        if (wasPlaying) { void el.play()?.catch(() => {}) } else { el.pause() }
      }
    }
  }
}

const goNext = () => {
  if (!hasNext.value) return
  seekTo(activeIndex.value + 1)
}

const onTimeUpdate = (e: Event) => {
  const el = e.target as HTMLVideoElement
  currentTime.value = el.currentTime
}

const onLoadedMetadata = () => {
  const el = videoRef.value
  if (!el) return
  duration.value = Number.isFinite(el.duration) ? el.duration : 0
  volume.value = el.volume
}

const onDurationChange = () => {
  const el = videoRef.value
  if (!el) return
  duration.value = Number.isFinite(el.duration) ? el.duration : 0
}

const onPlay = () => { isPlaying.value = true }
const onPause = () => { isPlaying.value = false }

const togglePlay = () => {
  const el = videoRef.value
  if (!el) return
  if (el.paused) { void el.play()?.catch(() => {}) }
  else el.pause()
}

const setVolume = (v: number) => {
  const el = videoRef.value
  if (!el) return
  el.volume = Math.max(0, Math.min(1, v))
  volume.value = el.volume
}

const wrapperRef = ref<HTMLElement | null>(null)
const isFullscreen = ref(false)

const toggleFullscreen = async () => {
  const wrapper = wrapperRef.value || videoRef.value?.parentElement
  if (!wrapper) return
  try {
    if (!document.fullscreenElement) {
      await wrapper.requestFullscreen?.()
    } else {
      await document.exitFullscreen?.()
    }
  } catch (e) {
    // ignore
  }
}

const onFsChange = () => {
  isFullscreen.value = !!document.fullscreenElement
}

let lastToggleAt = 0
const onVideoToggle = () => {
  const now = Date.now()
  if (now - lastToggleAt < 250) return
  lastToggleAt = now
  togglePlay()
  showControls()
}

const onKeyDown = (e: KeyboardEvent) => {
  if (e.code === 'Space') {
    const target = e.target as HTMLElement | null
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
    e.preventDefault()
    togglePlay()
    showControls()
  }
}

onMounted(() => {
  document.addEventListener('fullscreenchange', onFsChange)
  window.addEventListener('keydown', onKeyDown)
  // Начальное значение
  if (videoRef.value) {
    duration.value = Number.isFinite(videoRef.value.duration) ? videoRef.value.duration : 0
    volume.value = videoRef.value.volume
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', onFsChange)
  window.removeEventListener('keydown', onKeyDown)
  if (hideTimer) window.clearTimeout(hideTimer)
})

const onMouseEnter = () => {
  showControls()
}
const onMouseMove = () => {
  showControls()
}
const onMouseLeave = () => {
  scheduleHide(3000)
}
const onTouchStart = () => {
  showControls()
  scheduleHide(5000)
}

const formatTime = (sec: number) => {
  const s = Math.max(0, Math.floor(sec))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

watch(() => props.subtitles, () => {
  // сброс активного состояния при смене субтитров
  if (videoRef.value) currentTime.value = videoRef.value.currentTime || 0
  lastSubtitle.value = null
})
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
    transition: opacity .25s ease;

    &_visible { opacity: 1; }
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
    border: 1px solid rgba(255,255,255,0.25);
    background: rgba(30,30,30,0.7);
    color: #fff;
    padding: 6px 8px;
    border-radius: 8px;
    cursor: pointer;
    opacity: 0;
    pointer-events: none;
    transition: opacity .2s ease;

    &_prev { position: absolute; top: 50%; transform: translateY(-50%); left: 8px; }
    &_next { position: absolute; top: 50%; transform: translateY(-50%); right: 8px; }

    &_visible { opacity: 1; pointer-events: auto; }

    &:disabled { cursor: default; }
    &.video-player__btn_visible:disabled { opacity: 0.4; }
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
    pointer-events: none;

    position: absolute;
    bottom: 27%;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
  }
  &__subtitle_line { display: block; }
  &__subtitle_line-primary { font-weight: 600; }
  &__subtitle_line-secondary { opacity: 0.9; margin-top: 4px; }

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
    transition: background .2s ease;

    &_active {
      background: #e9f2ff;
    }
  }

  &__cue_time { color: #666; font-variant-numeric: tabular-nums; }
  &__cue_text { color: #111; }
  &__cue_text-th { font-weight: 600; }
  &__cue_text-selected { opacity: 0.9; }
  &__cue_text_all { display: grid; gap: 2px; }
  &__cue_text_ru { opacity: 0.95; }
  &__cue_text_en { opacity: 0.95; }
}
</style>
