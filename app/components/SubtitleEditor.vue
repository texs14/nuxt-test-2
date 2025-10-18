<template>
  <section class="subtitle-editor">
    <header class="subtitle-editor__head">
      <h2 class="subtitle-editor__title">{{ t('editor.title') }}</h2>
      <div class="subtitle-editor__actions">
        <TranslateButton
          v-if="canTranslateAll"
          size="normal"
          :loading="isTranslating"
          :disabled="isTranslating"
          @click="handleTranslateAll"
        >
          {{
            isTranslating && translationProgress
              ? t('editor.translationProgress', {
                  current: translationProgress.current,
                  total: translationProgress.total,
                })
              : t('editor.translateAll')
          }}
        </TranslateButton>
        <button class="subtitle-editor__btn" type="button" @click="addRow">
          {{ t('editor.addRow') }}
        </button>
      </div>
    </header>

    <div class="subtitle-editor__table">
      <div class="subtitle-editor__row subtitle-editor__row_head">
        <div class="subtitle-editor__cell subtitle-editor__cell_text">{{ t('editor.textTH') }}</div>
        <div class="subtitle-editor__cell subtitle-editor__cell_tools">
          {{ t('editor.actions') }}
        </div>
      </div>

      <div v-for="(row, idx) in rows" :key="row.id ?? idx" class="subtitle-editor__row">
        <div
          class="subtitle-editor__cell subtitle-editor__cell_text subtitle-editor__cell_text_stack"
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
            <input
              class="subtitle-editor__input"
              type="number"
              step="0.01"
              min="0"
              :value="row.end"
              @input="onUpdate(idx, 'end', toNumber(($event.target as HTMLInputElement).value))"
            />
          </div>
          <textarea
            class="subtitle-editor__textarea"
            rows="2"
            :value="row.text?.th || ''"
            @input="onUpdateText(idx, 'th', ($event.target as HTMLTextAreaElement).value)"
          />

          <button type="button" class="subtitle-editor__toggle" @click="toggleMore(row, idx)">
            RU / EN
            <span
              class="subtitle-editor__toggle_icon"
              :class="{ 'subtitle-editor__toggle_icon_open': expandedMap[row.id ?? idx] }"
              >&ndash;</span
            >
          </button>

          <div
            class="subtitle-editor__more"
            :class="{ 'subtitle-editor__more_open': expandedMap[row.id ?? idx] }"
          >
            <div class="subtitle-editor__more_inner">
              <div class="subtitle-editor__cell_text_item">
                <label for="ru">RU</label>
                <textarea
                  class="subtitle-editor__textarea"
                  rows="2"
                  :value="row.text?.ru || ''"
                  @input="onUpdateText(idx, 'ru', ($event.target as HTMLTextAreaElement).value)"
                />
              </div>
              <div class="subtitle-editor__cell_text_item">
                <label for="en">EN</label>
                <textarea
                  class="subtitle-editor__textarea"
                  rows="2"
                  :value="row.text?.en || ''"
                  @input="onUpdateText(idx, 'en', ($event.target as HTMLTextAreaElement).value)"
                />
              </div>

              <TranslateButton
                size="small"
                :loading="isTranslatingId(row.id ?? idx)"
                :disabled="!row.text?.th || isTranslating"
                @click="handleTranslateRow(idx)"
              >
                {{ t('editor.translateRow') }}
              </TranslateButton>

              <div v-if="translationError" class="subtitle-editor__error">
                {{ t('editor.translationError') }}: {{ translationError }}
              </div>
            </div>
          </div>
        </div>
        <div class="subtitle-editor__cell subtitle-editor__cell_tools">
          <button
            class="subtitle-editor__btn subtitle-editor__btn_danger"
            type="button"
            @click="removeRow(idx)"
          >
            {{ t('editor.delete') }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { normalizeThaiEditorValue } from '~/composables/shared/useThaiTextProcessing';
import { useSubtitleTranslation } from '~/composables/useSubtitleTranslation';

interface SubtitleText {
  th?: string;
  en?: string;
  ru?: string;
}
interface SubtitleItem {
  id?: number | string;
  start?: number;
  end?: number;
  text?: SubtitleText | string;
}
type RequiredSubtitleItem = {
  id?: number | string;
  start: number;
  end: number;
  text: SubtitleText;
};

const props = defineProps<{ modelValue: SubtitleItem[] }>();
const emit = defineEmits<{ (e: 'update:modelValue', value: RequiredSubtitleItem[]): void }>();

const normalize = (s: SubtitleItem, idx = 0): RequiredSubtitleItem => ({
  id: s.id ?? idx + 1,
  start: Number(s.start ?? 0),
  end: Number(s.end ?? 0),
  text: typeof s.text === 'string' ? { ru: s.text } : s.text || {},
});

const rows = ref<RequiredSubtitleItem[]>(props.modelValue.map((s, i) => normalize(s, i)));

const { t } = useI18n();

// Composable для перевода субтитров
const {
  isTranslating,
  translatingIds,
  translationProgress,
  error: translationError,
  translateSubtitle,
  translateBatch,
  isTranslatingId,
} = useSubtitleTranslation();

// РљР°СЂС‚Р° СЂР°Р·РІС‘СЂРЅСѓС‚РѕСЃС‚Рё РґР»СЏ RU/EN РїРѕ РєР»СЋС‡Сѓ СЃС‚СЂРѕРєРё
const expandedMap = ref<Record<string, boolean>>({});

function rowKey(row: RequiredSubtitleItem, idx: number): string {
  return String(row.id ?? idx);
}

function toggleMore(row: RequiredSubtitleItem, idx: number) {
  const k = rowKey(row, idx);
  expandedMap.value[k] = !expandedMap.value[k];
  // РўСЂРёРіРіРµСЂРёРј РѕР±РЅРѕРІР»РµРЅРёРµ
  expandedMap.value = { ...expandedMap.value };
}

watch(
  () => props.modelValue,
  (v) => {
    rows.value = (v || []).map((s, i) => normalize(s, i));
  }
);

const toNumber = (v: string) => {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
};

function addRow() {
  rows.value = [
    ...rows.value,
    { id: Math.random().toString(36).slice(2), start: 0, end: 0, text: { th: '', ru: '', en: '' } },
  ];
  emit('update:modelValue', rows.value);
}

function removeRow(idx: number) {
  rows.value.splice(idx, 1);
  rows.value = [...rows.value];
  emit('update:modelValue', rows.value);
}

function onUpdate(index: number, key: 'start' | 'end', value: number) {
  const next = [...rows.value];
  const item = { ...next[index] };
  if (key === 'start') item.start = value;
  else item.end = value;
  next[index] = item as RequiredSubtitleItem;
  rows.value = next;
  emit('update:modelValue', rows.value);
}

function onUpdateText(index: number, lang: 'th' | 'ru' | 'en', value: string) {
  const next = [...rows.value];
  const item = { ...next[index] };
  const t = item.text || {};
  const formattedValue = lang === 'th' ? normalizeThaiEditorValue(value) : value;
  next[index] = { ...item, text: { ...t, [lang]: formattedValue } } as RequiredSubtitleItem;
  rows.value = next;
  emit('update:modelValue', rows.value);
}

function onStartBlur() {
  if (rows.value.length < 2) {
    return;
  }

  const sorted = [...rows.value].sort((a, b) => a.start - b.start);

  const changed = sorted.some((item, index) => item !== rows.value[index]);

  if (!changed) {
    return;
  }

  rows.value = sorted;
  emit('update:modelValue', rows.value);
}

// Проверка, есть ли субтитры для перевода
const canTranslateAll = computed(() => {
  return rows.value.some((row) => row.text?.th?.trim());
});

// Обработчик перевода одной строки
async function handleTranslateRow(idx: number) {
  const row = rows.value[idx];
  if (!row) {
    return;
  }

  const thaiText = row.text?.th;
  if (!thaiText?.trim()) {
    return;
  }

  const result = await translateSubtitle(thaiText);

  if (result) {
    // Обновляем RU и EN переводы
    onUpdateText(idx, 'ru', result.ru);
    onUpdateText(idx, 'en', result.en);
  }
}

// Обработчик массового перевода
async function handleTranslateAll() {
  const subtitlesToTranslate = rows.value
    .map((row, idx) => ({
      id: row.id ?? idx,
      th: row.text?.th || '',
      index: idx,
    }))
    .filter((item) => item.th.trim());

  if (subtitlesToTranslate.length === 0) {
    return;
  }

  await translateBatch(subtitlesToTranslate, (id, result) => {
    // Находим индекс строки по ID
    const subtitle = subtitlesToTranslate.find((s) => s.id === id);
    if (subtitle) {
      onUpdateText(subtitle.index, 'ru', result.ru);
      onUpdateText(subtitle.index, 'en', result.en);
    }
  });
}

const a = {
  id: 1,
  end: 15.16,
  text: {
    en: 'Hello, friends',
    ru: 'Здравствуйте, друзья',
    th: 'สวัสดีครับเพื่อนๆ ก็ต้องขอยินดีตอนรับเพื่อนๆ',
  },
  start: 7.06,
};

const b = {
  id: 1,
  end: 15.16,
  text: {
    en: 'Hello, friends',
    ru: 'Здравствуйте, друзья',
    th: {
      sentences: [
        ['สวัสดี', 'ครับ', 'เพื่อนๆ'],
        ['ก็', 'ต้อง', 'ขอ', 'ยินดี', 'ต้อนรับ', 'เพื่อนๆ'],
      ],
    },
  },
  start: 7.06,
};
</script>

<style lang="scss" scoped>
.subtitle-editor {
  background: #fff;
  border: 1px solid #eee;
  border-radius: 12px;
  padding: 16px;
}

.subtitle-editor__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.subtitle-editor__title {
  margin: 0;
  font-size: 18px;
}
.subtitle-editor__actions {
  display: flex;
  gap: 8px;
}
.subtitle-editor__btn {
  appearance: none;
  border: 1px solid #ddd;
  background: #f6f6f6;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
}
.subtitle-editor__btn_danger {
  border-color: #fecaca;
  background: #fef2f2;
  color: #b91c1c;
}

.subtitle-editor__table {
  display: grid;
  gap: 8px;
}
.subtitle-editor__row {
  display: grid;
  grid-template-columns: 1fr 120px;
  gap: 8px;
  align-items: start;

  border-radius: 24px;
  border: 1px solid #727272;
  padding: 16px 8px;
}
.subtitle-editor__row_head {
  font-weight: 600;
  color: #555;
}
.subtitle-editor__cell_tools {
  display: flex;
  align-items: center;
  gap: 6px;
}
.subtitle-editor__input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}
.subtitle-editor__textarea {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  resize: vertical;
  font-size: 18px;
  box-sizing: border-box;
}

/* РЎС‚РµРє С‚РµРєСЃС‚РѕРІС‹С… РїРѕР»РµР№ */
.subtitle-editor__cell {
  &_time {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 240px;
  }
  &_text_stack {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
}
/* РљРЅРѕРїРєР° СЃРІРѕСЂР°С‡РёРІР°РЅРёСЏ */
.subtitle-editor__toggle {
  align-self: flex-start;
  appearance: none;
  border: 1px solid #ddd;
  background: #f6f6f6;
  padding: 4px 8px;
  border-radius: 8px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}
.subtitle-editor__toggle_icon {
  display: inline-block;
  transition: transform 0.2s ease;
}
.subtitle-editor__toggle_icon_open {
  transform: rotate(180deg);
}

/* РџР»Р°РІРЅРѕРµ СЃРІРѕСЂР°С‡РёРІР°РЅРёРµ/СЂР°Р·РІРѕСЂР°С‡РёРІР°РЅРёРµ */
.subtitle-editor__more {
  overflow: hidden;
  max-height: 0;
  opacity: 0;
  transition:
    max-height 0.25s ease,
    opacity 0.2s ease;
}
.subtitle-editor__more_open {
  max-height: 420px;
  opacity: 1;
}
.subtitle-editor__more_inner {
  padding-top: 6px;
  display: grid;
  gap: 8px;
}

.subtitle-editor__error {
  padding: 8px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #b91c1c;
  font-size: 12px;
}
</style>
