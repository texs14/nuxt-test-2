<template>
  <section class="subtitle-editor">
    <header class="subtitle-editor__head">
      <h2 class="subtitle-editor__title">{{ t('editor.title') }}</h2>
      <div class="subtitle-editor__actions">
        <button class="subtitle-editor__btn" type="button" @click="addRow">{{ t('editor.addRow') }}</button>
      </div>
    </header>

    <div class="subtitle-editor__table">
      <div class="subtitle-editor__row subtitle-editor__row_head">
        <div class="subtitle-editor__cell subtitle-editor__cell_time">{{ t('editor.start') }}</div>
        <div class="subtitle-editor__cell subtitle-editor__cell_time">{{ t('editor.end') }}</div>
        <div class="subtitle-editor__cell subtitle-editor__cell_text">{{ t('editor.textTH') }}</div>
        <div class="subtitle-editor__cell subtitle-editor__cell_tools">{{ t('editor.actions') }}</div>
      </div>

      <div
        v-for="(row, idx) in rows"
        :key="row.id ?? idx"
        class="subtitle-editor__row"
      >
        <div class="subtitle-editor__cell subtitle-editor__cell_time">
          <input
            class="subtitle-editor__input"
            type="number"
            step="0.01"
            min="0"
            :value="row.start"
            @input="onUpdate(idx, 'start', toNumber(($event.target as HTMLInputElement).value))"
            @blur="onStartBlur"
          />
        </div>
        <div class="subtitle-editor__cell subtitle-editor__cell_time">
          <input
            class="subtitle-editor__input"
            type="number"
            step="0.01"
            min="0"
            :value="row.end"
            @input="onUpdate(idx, 'end', toNumber(($event.target as HTMLInputElement).value))"
          />
        </div>
        <div class="subtitle-editor__cell subtitle-editor__cell_text subtitle-editor__cell_text_stack">
          <textarea
            class="subtitle-editor__textarea"
            rows="2"
            :value="row.text?.th || ''"
            @input="onUpdateText(idx, 'th', ($event.target as HTMLTextAreaElement).value)"
          />

          <button type="button" class="subtitle-editor__toggle" @click="toggleMore(row, idx)">
            RU / EN
            <span class="subtitle-editor__toggle_icon" :class="{ 'subtitle-editor__toggle_icon_open': expandedMap[row.id ?? idx] }">▾</span>
          </button>

          <div class="subtitle-editor__more" :class="{ 'subtitle-editor__more_open': expandedMap[row.id ?? idx] }">
            <div class="subtitle-editor__more_inner">
              <div class="subtitle-editor__cell_text_item">
                <textarea
                  class="subtitle-editor__textarea"
                  rows="2"
                  :value="row.text?.ru || ''"
                  @input="onUpdateText(idx, 'ru', ($event.target as HTMLTextAreaElement).value)"
                />
              </div>
              <div class="subtitle-editor__cell_text_item">
                <textarea
                  class="subtitle-editor__textarea"
                  rows="2"
                  :value="row.text?.en || ''"
                  @input="onUpdateText(idx, 'en', ($event.target as HTMLTextAreaElement).value)"
                />
              </div>
            </div>
          </div>
        </div>
        <div class="subtitle-editor__cell subtitle-editor__cell_tools">
          <button class="subtitle-editor__btn subtitle-editor__btn_danger" type="button" @click="removeRow(idx)">{{ t('editor.delete') }}</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

interface SubtitleText { th?: string; en?: string; ru?: string }
interface SubtitleItem { id?: number|string; start?: number; end?: number; text?: SubtitleText | string }
type RequiredSubtitleItem = { id?: number|string; start: number; end: number; text: SubtitleText }

const props = defineProps<{ modelValue: SubtitleItem[] }>()
const emit = defineEmits<{ (e: 'update:modelValue', value: RequiredSubtitleItem[]): void }>()

const normalize = (s: SubtitleItem, idx = 0): RequiredSubtitleItem => ({
  id: s.id ?? idx + 1,
  start: Number(s.start ?? 0),
  end: Number(s.end ?? 0),
  text: typeof s.text === 'string' ? { ru: s.text } : (s.text || {})
})

const rows = ref<RequiredSubtitleItem[]>(props.modelValue.map((s, i) => normalize(s, i)))

const { t } = useI18n()

// Карта развёрнутости для RU/EN по ключу строки
const expandedMap = ref<Record<string, boolean>>({})

function rowKey(row: RequiredSubtitleItem, idx: number): string {
  return String(row.id ?? idx)
}

function toggleMore(row: RequiredSubtitleItem, idx: number) {
  const k = rowKey(row, idx)
  expandedMap.value[k] = !expandedMap.value[k]
  // Триггерим обновление
  expandedMap.value = { ...expandedMap.value }
}

watch(() => props.modelValue, (v) => {
  rows.value = (v || []).map((s, i) => normalize(s, i))
})

const toNumber = (v: string) => {
  const n = Number(v)
  return isNaN(n) ? 0 : n
}

function sanitizeThaiSpacing(text: string): string {
  if (!text) return ''
  // Удаляем пробелы между тайскими буквами
  let out = text
  const re = /([\u0E00-\u0E7F])\s+([\u0E00-\u0E7F])/g
  for (let i = 0; i < 5; i++) {
    const next = out.replace(re, '$1$2')
    if (next === out) break
    out = next
  }
  return out
}

function addRow() {
  rows.value = [
    ...rows.value,
    { id: Math.random().toString(36).slice(2), start: 0, end: 0, text: { th: '', ru: '', en: '' } }
  ]
  emit('update:modelValue', rows.value)
}

function removeRow(idx: number) {
  rows.value.splice(idx, 1)
  rows.value = [...rows.value]
  emit('update:modelValue', rows.value)
}

function onUpdate(index: number, key: 'start'|'end', value: number) {
  const next = [...rows.value]
  const item = { ...next[index] }
  if (key === 'start') item.start = value
  else item.end = value
  next[index] = item as RequiredSubtitleItem
  rows.value = next
  emit('update:modelValue', rows.value)
}

function onUpdateText(index: number, lang: 'th'|'ru'|'en', value: string) {
  const next = [...rows.value]
  const item = { ...next[index] }
  const t = item.text || {}
  next[index] = { ...item, text: { ...t, [lang]: value } } as RequiredSubtitleItem
  rows.value = next
  emit('update:modelValue', rows.value)
}

function onStartBlur() {
  if (rows.value.length < 2) {
    return
  }

  const sorted = [...rows.value].sort((a, b) => a.start - b.start)

  const changed = sorted.some((item, index) => item !== rows.value[index])

  if (!changed) {
    return
  }

  rows.value = sorted
  emit('update:modelValue', rows.value)
}
</script>

<style scoped>
.subtitle-editor {
  background: #fff;
  border: 1px solid #eee;
  border-radius: 12px;
  padding: 16px;
}

.subtitle-editor__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.subtitle-editor__title { margin: 0; font-size: 18px; }
.subtitle-editor__actions { display: flex; gap: 8px; }
.subtitle-editor__btn { appearance: none; border: 1px solid #ddd; background: #f6f6f6; padding: 6px 10px; border-radius: 8px; cursor: pointer; }
.subtitle-editor__btn_danger { border-color: #fecaca; background: #fef2f2; color: #b91c1c; }

.subtitle-editor__table { display: grid; gap: 8px; }
.subtitle-editor__row { display: grid; grid-template-columns: 120px 120px 1fr 120px; gap: 8px; align-items: start; }
.subtitle-editor__row_head { font-weight: 600; color: #555; }
.subtitle-editor__cell_tools { display: flex; align-items: center; gap: 6px; }
.subtitle-editor__input { width: 100%; padding: 6px 8px; border: 1px solid #e5e7eb; border-radius: 8px; }
.subtitle-editor__textarea { width: 100%; padding: 6px 8px; border: 1px solid #e5e7eb; border-radius: 8px; resize: vertical; }

/* Стек текстовых полей */
.subtitle-editor__cell_text_stack { display: flex; flex-direction: column; gap: 8px; }

/* Кнопка сворачивания */
.subtitle-editor__toggle { align-self: flex-start; appearance: none; border: 1px solid #ddd; background: #f6f6f6; padding: 4px 8px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-size: 12px; }
.subtitle-editor__toggle_icon { display: inline-block; transition: transform .2s ease; }
.subtitle-editor__toggle_icon_open { transform: rotate(180deg); }

/* Плавное сворачивание/разворачивание */
.subtitle-editor__more { overflow: hidden; max-height: 0; opacity: 0; transition: max-height .25s ease, opacity .2s ease; }
.subtitle-editor__more_open { max-height: 420px; opacity: 1; }
.subtitle-editor__more_inner { padding-top: 6px; display: grid; gap: 8px; }

</style>
