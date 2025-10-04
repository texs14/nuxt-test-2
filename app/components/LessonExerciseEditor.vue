<template>
  <section class="exercise-editor">
    <h2 class="exercise-editor__title">Упражнения</h2>
    <p class="exercise-editor__hint">Добавьте предложения для упражнений на трех языках</p>

    <div class="exercise-editor__list">
      <div v-for="(item, index) in localExercises" :key="index" class="exercise-editor__item">
        <div class="exercise-editor__row">
          <div class="exercise-editor__field">
            <label class="exercise-editor__label">Текст на тайском</label>
            <textarea
              :value="item.th"
              class="exercise-editor__textarea"
              rows="2"
              placeholder="ใส่ข้อความภาษาไทย"
              @input="onUpdateText(index, 'th', ($event.target as HTMLTextAreaElement).value)"
            />
          </div>
          <div class="exercise-editor__field">
            <label class="exercise-editor__label">Текст на русском</label>
            <textarea
              :value="item.ru"
              class="exercise-editor__textarea"
              rows="2"
              placeholder="Введите текст на русском"
              @input="onUpdateText(index, 'ru', ($event.target as HTMLTextAreaElement).value)"
            />
          </div>
          <div class="exercise-editor__field">
            <label class="exercise-editor__label">Текст на английском</label>
            <textarea
              :value="item.en"
              class="exercise-editor__textarea"
              rows="2"
              placeholder="Enter text in English"
              @input="onUpdateText(index, 'en', ($event.target as HTMLTextAreaElement).value)"
            />
          </div>
          <button type="button" class="exercise-editor__delete" @click="removeExercise(index)">
            Удалить
          </button>
        </div>
      </div>
    </div>

    <button type="button" class="exercise-editor__add" @click="addExercise">
      + Добавить предложение
    </button>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

interface ExerciseItem {
  th: string;
  ru: string;
  en: string;
}

const props = defineProps<{
  modelValue: ExerciseItem[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: ExerciseItem[]): void;
}>();

const localExercises = ref<ExerciseItem[]>([...props.modelValue]);

watch(
  () => props.modelValue,
  (newVal) => {
    localExercises.value = [...newVal];
  },
  { deep: true }
);

function normalizeThaiEditorValue(text: string): string {
  if (!text) return '';
  const cleaned = text
    .replace(/\r?\n/gu, ' ')
    .replace(/\u00A0/gu, ' ')
    .replace(/\t+/gu, ' ')
    .replace(/ {4,}/gu, '   ')
    .trim();
  return cleaned;
}

function onUpdateText(index: number, lang: 'th' | 'ru' | 'en', value: string) {
  const formattedValue = lang === 'th' ? normalizeThaiEditorValue(value) : value;
  const current = localExercises.value[index];
  if (!current) return;

  localExercises.value[index] = {
    th: lang === 'th' ? formattedValue : current.th,
    ru: lang === 'ru' ? formattedValue : current.ru,
    en: lang === 'en' ? formattedValue : current.en,
  };
  emit('update:modelValue', localExercises.value);
}

function addExercise() {
  localExercises.value.push({ th: '', ru: '', en: '' });
  emit('update:modelValue', localExercises.value);
}

function removeExercise(index: number) {
  localExercises.value.splice(index, 1);
  emit('update:modelValue', localExercises.value);
}
</script>

<style scoped>
.exercise-editor {
  background: #f9fafb;
  padding: 20px;
  border-radius: 12px;
}

.exercise-editor__title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px;
}

.exercise-editor__hint {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 16px;
}

.exercise-editor__list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 16px;
}

.exercise-editor__item {
  background: white;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.exercise-editor__row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr auto;
  gap: 12px;
  align-items: end;
}

.exercise-editor__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.exercise-editor__label {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
}

.exercise-editor__textarea {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  resize: vertical;
  font-family: inherit;
}

.exercise-editor__textarea:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.exercise-editor__delete {
  padding: 8px 16px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: background 0.2s ease;
}

.exercise-editor__delete:hover {
  background: #dc2626;
}

.exercise-editor__add {
  padding: 10px 20px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: background 0.2s ease;
}

.exercise-editor__add:hover {
  background: #059669;
}
</style>
