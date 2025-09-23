<template>
  <section class="video-upload-form__meta">
    <h2 class="video-upload-form__subtitle">{{ t('meta.title') }}</h2>
    <div class="video-upload-form__grid">
      <div class="video-upload-form__field">
        <label class="video-upload-form__label">{{ t('meta.nameTH') }}</label>
        <input class="video-upload-form__input" :value="title.th" @input="onTitle('th', ($event.target as HTMLInputElement).value)" />
      </div>
      <div class="video-upload-form__field">
        <label class="video-upload-form__label">{{ t('meta.nameRU') }}</label>
        <input class="video-upload-form__input" :value="title.ru" @input="onTitle('ru', ($event.target as HTMLInputElement).value)" />
      </div>
      <div class="video-upload-form__field">
        <label class="video-upload-form__label">{{ t('meta.nameEN') }}</label>
        <input class="video-upload-form__input" :value="title.en" @input="onTitle('en', ($event.target as HTMLInputElement).value)" />
      </div>

      <div class="video-upload-form__field">
        <label class="video-upload-form__label">{{ t('meta.descTH') }}</label>
        <textarea class="video-upload-form__textarea" rows="3" :value="description.th" @input="onDesc('th', ($event.target as HTMLTextAreaElement).value)" />
      </div>
      <div class="video-upload-form__field">
        <label class="video-upload-form__label">{{ t('meta.descRU') }}</label>
        <textarea class="video-upload-form__textarea" rows="3" :value="description.ru" @input="onDesc('ru', ($event.target as HTMLTextAreaElement).value)" />
      </div>
      <div class="video-upload-form__field">
        <label class="video-upload-form__label">{{ t('meta.descEN') }}</label>
        <textarea class="video-upload-form__textarea" rows="3" :value="description.en" @input="onDesc('en', ($event.target as HTMLTextAreaElement).value)" />
      </div>

      <div class="video-upload-form__field">
        <label class="video-upload-form__label">{{ t('meta.level') }}</label>
        <select class="video-upload-form__input" :value="level" @change="onLevel(($event.target as HTMLSelectElement).value)">
          <option value="A1">A1</option>
          <option value="A2">A2</option>
          <option value="B1">B1</option>
          <option value="B2">B2</option>
          <option value="C1">C1</option>
          <option value="C2">C2</option>
        </select>
      </div>
    </div>

    <div class="video-upload-form__actions">
      <button class="video-upload-form__button" :disabled="!canSave || saving" @click="$emit('save')">
        {{ saving ? t('meta.saving') : t('meta.save') }}
      </button>
      <span v-if="saveError" class="video-upload-form__error">{{ saveError }}</span>
      <span v-if="saveOk" class="video-upload-form__hint">{{ t('meta.saved', { id: String(saveId) }) }}</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

interface SubtitleText { th?: string; en?: string; ru?: string }

const props = defineProps<{
  title: SubtitleText
  description: SubtitleText
  level: string
  saving: boolean
  saveError: string
  saveOk: boolean
  saveId: string | number | ''
  canSave: boolean
}>()

const emit = defineEmits<{
  (e: 'update:title', value: SubtitleText): void
  (e: 'update:description', value: SubtitleText): void
  (e: 'update:level', value: string): void
  (e: 'save'): void
}>()

const { t } = useI18n()

function onTitle(key: 'th'|'ru'|'en', value: string) {
  emit('update:title', { ...props.title, [key]: value })
}
function onDesc(key: 'th'|'ru'|'en', value: string) {
  emit('update:description', { ...props.description, [key]: value })
}
function onLevel(value: string) {
  emit('update:level', value)
}
</script>

<style scoped>
.video-upload-form__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.video-upload-form__field { display: flex; flex-direction: column; gap: 8px; }
.video-upload-form__label { font-weight: 600; }
.video-upload-form__input { padding: 10px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fafafa; }
.video-upload-form__textarea { padding: 10px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fafafa; }
.video-upload-form__actions { display: flex; gap: 12px; margin-top: 12px; }
.video-upload-form__button { appearance: none; border: none; background: #2563eb; color: white; padding: 10px 16px; border-radius: 8px; cursor: pointer; }
.video-upload-form__button:disabled { background: #93c5fd; cursor: not-allowed; }
.video-upload-form__error { color: #b91c1c; background: #fef2f2; border: 1px solid #fecaca; padding: 10px; border-radius: 8px; }
.video-upload-form__hint { color: #374151; font-size: 12px; }
</style>
