<template>
  <div class="video-controls" role="group" aria-label="Панель управления видео">
    <button
      class="video-controls__btn video-controls__btn_play"
      type="button"
      :aria-label="playing ? 'Пауза' : 'Старт'"
      @click="$emit('toggle-play')"
    >
      <span v-if="!playing">▶</span>
      <span v-else>⏸</span>
    </button>

    <div class="video-controls__time">
      <span class="video-controls__time_current">{{ formatTime(currentTime) }}</span>
      <div
        class="video-controls__track"
        ref="trackRef"
        role="slider"
        :aria-valuemin="0"
        :aria-valuemax="duration"
        :aria-valuenow="clampedTime"
        tabindex="0"
        @click="onTrackClick"
        @mousedown.prevent="onDragStart"
        @touchstart.prevent="onDragStartTouch"
      >
        <div class="video-controls__track_bar">
          <div class="video-controls__track_progress" :style="{ width: progress + '%' }" />
          <div class="video-controls__track_thumb" :style="{ left: progress + '%' }" />
        </div>
      </div>
      <span class="video-controls__time_total">{{ formatTime(duration) }}</span>
    </div>

    <div
      class="video-controls__volume"
      @mouseenter="onVolumeMouseEnter"
      @mouseleave="onVolumeMouseLeave"
    >
      <button
        type="button"
        class="video-controls__volume_btn"
        aria-label="Громкость"
        @click="onVolumeToggleTouch"
      >
        <svg class="video-controls__volume_icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 9v6h4l5 5V4L8 9H4z" fill="currentColor"/>
        </svg>
      </button>
      <div class="video-controls__volume_popup" :class="{ 'video-controls__volume_popup_visible': showVolume }">
        <input
          class="video-controls__volume_slider"
          type="range"
          min="0"
          max="1"
          step="0.01"
          :value="volume"
          @input="onVolumeInput"
          aria-label="Громкость"
        />
      </div>
    </div>

    <button
      class="video-controls__btn video-controls__btn_fullscreen"
      type="button"
      aria-label="На весь экран"
      @click="$emit('toggle-fullscreen')"
    >
      ⛶
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'

const props = defineProps<{
  playing: boolean
  currentTime: number
  duration: number
  volume: number
}>()

const emit = defineEmits<{
  (e: 'toggle-play'): void
  (e: 'seek', time: number): void
  (e: 'toggle-fullscreen'): void
  (e: 'set-volume', value: number): void
}>()

const trackRef = ref<HTMLDivElement | null>(null)
const clampedTime = computed(() => Math.max(0, Math.min(props.currentTime || 0, props.duration || 0)))
const progress = computed(() => {
  if (!props.duration) return 0
  return Math.min(100, Math.max(0, (clampedTime.value / props.duration) * 100))
})

const formatTime = (sec: number) => {
  const s = Math.max(0, Math.floor(sec || 0))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

let isDragging = false
const onTrackClick = (e: MouseEvent) => {
  if (!trackRef.value || !props.duration) return
  const rect = trackRef.value.getBoundingClientRect()
  const ratio = (e.clientX - rect.left) / rect.width
  const t = Math.max(0, Math.min(props.duration, ratio * props.duration))
  emit('seek', t)
}

const onDragStart = (e: MouseEvent) => {
  if (!trackRef.value || !props.duration) return
  isDragging = true
  window.addEventListener('mousemove', onDragMove)
  window.addEventListener('mouseup', onDragEnd)
  onDragMove(e)
}

const onDragMove = (e: MouseEvent) => {
  if (!isDragging || !trackRef.value || !props.duration) return
  const rect = trackRef.value.getBoundingClientRect()
  const x = Math.max(rect.left, Math.min(e.clientX, rect.right))
  const ratio = (x - rect.left) / rect.width
  emit('seek', ratio * props.duration)
}

const onDragEnd = () => {
  isDragging = false
  window.removeEventListener('mousemove', onDragMove)
  window.removeEventListener('mouseup', onDragEnd)
}

let touchId: number | null = null
const onDragStartTouch = (e: TouchEvent) => {
  if (!trackRef.value || !props.duration) return
  const first = e.changedTouches && e.changedTouches.length > 0 ? e.changedTouches[0] : null
  if (!first) return
  touchId = first.identifier
  window.addEventListener('touchmove', onTouchMove, { passive: false })
  window.addEventListener('touchend', onTouchEnd)
  onTouchMove(e)
}

const onTouchMove = (e: TouchEvent) => {
  if (touchId === null || !trackRef.value || !props.duration) return
  const t = Array.from(e.changedTouches).find(x => x.identifier === touchId)
  if (!t) return
  const rect = trackRef.value.getBoundingClientRect()
  const x = Math.max(rect.left, Math.min(t.clientX, rect.right))
  const ratio = (x - rect.left) / rect.width
  emit('seek', ratio * props.duration)
}

const onTouchEnd = () => {
  touchId = null
  window.removeEventListener('touchmove', onTouchMove)
  window.removeEventListener('touchend', onTouchEnd)
}

// Volume popup logic
const showVolume = ref(false)
let volumeHideTimer: number | null = null

const clearVolumeTimer = () => {
  if (volumeHideTimer) {
    window.clearTimeout(volumeHideTimer)
    volumeHideTimer = null
  }
}

const onVolumeMouseEnter = () => {
  showVolume.value = true
  clearVolumeTimer()
}

const onVolumeMouseLeave = () => {
  clearVolumeTimer()
  volumeHideTimer = window.setTimeout(() => {
    showVolume.value = false
    volumeHideTimer = null
  }, 1000)
}

const onVolumeToggleTouch = () => {
  // Toggle for touch devices; also works as click fallback
  showVolume.value = !showVolume.value
  clearVolumeTimer()
  if (showVolume.value) {
    volumeHideTimer = window.setTimeout(() => {
      showVolume.value = false
      volumeHideTimer = null
    }, 6000)
  }
}

const onVolumeInput = (e: Event) => {
  const target = e.target as HTMLInputElement | null
  if (!target) return
  const v = Number(target.value)
  emit('set-volume', isNaN(v) ? 0 : v)
}

onBeforeUnmount(() => {
  onDragEnd()
  onTouchEnd()
  clearVolumeTimer()
})
</script>

<style scoped lang="scss">
.video-controls {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(22,22,22,0.75);
  color: #fff;
  backdrop-filter: saturate(140%) blur(6px);

  z-index: 9;

  &__btn {
    appearance: none;
    border: 1px solid rgba(255,255,255,0.25);
    background: rgba(40,40,40,0.7);
    color: #fff;
    padding: 6px 10px;
    border-radius: 8px;
    cursor: pointer;
  }

  &__time {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }
  &__time_current, &__time_total { font-variant-numeric: tabular-nums; opacity: 0.95; }

  &__track {
    position: relative;
    height: 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
  }
  &__track_bar {
    position: relative;
    width: 100%;
    height: 6px;
    background: rgba(255,255,255,0.25);
    border-radius: 999px;
    overflow: hidden;
  }
  &__track_progress {
    position: absolute;
    left: 0; top: 0; bottom: 0;
    background: #3b82f6;
    width: 0%;
  }
  &__track_thumb {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 14px;
    height: 14px;
    background: #fff;
    border: 2px solid #3b82f6;
    border-radius: 50%;
    box-shadow: 0 1px 2px rgba(0,0,0,0.4);
    pointer-events: none;
  }

  &__volume {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 36px;
  }
  &__volume_btn {
    appearance: none;
    border: 1px solid rgba(255,255,255,0.25);
    background: rgba(40,40,40,0.7);
    color: #fff;
    padding: 6px 10px;
    border-radius: 8px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  &__volume_icon { opacity: 0.95; }
  &__volume_popup {
    position: absolute;
    bottom: 44px;
    left: 50%;
    transform: translateX(-50%);
    padding: 10px;
    border-radius: 10px;
    background: rgba(22,22,22,0.9);
    border: 1px solid rgba(255,255,255,0.2);
    backdrop-filter: saturate(140%) blur(6px);
    box-shadow: 0 6px 24px rgba(0,0,0,0.35);
    opacity: 0;
    pointer-events: none;
    transition: opacity .2s ease;
    z-index: 5;
    width: 56px;
    height: 180px;
    display: grid;
    place-items: center;
  }
  &__volume_popup_visible {
    opacity: 1;
    pointer-events: auto;
  }
  &__volume_slider {
    transform: rotate(-90deg) translateY(-265%);
    width: 160px;
    height: 20px;
  }
}
</style>
