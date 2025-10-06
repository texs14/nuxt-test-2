<template>
  <div class="click-exercise">
    <header class="click-exercise__header">
      <h3 class="click-exercise__title">{{ t('clickExercise.title') }}</h3>
      <div class="click-exercise__progress-wrapper">
        <span class="click-exercise__progress">{{ progressLabel }}</span>
        <span class="click-exercise__completion">{{ completionLabel }}</span>
      </div>
    </header>

    <div v-if="currentSentence" class="click-exercise__body">
      <p class="click-exercise__instruction">
        {{ t('clickExercise.instruction') }}
      </p>

      <p v-if="showTranslation && currentTranslation" class="click-exercise__translation">
        {{ currentTranslation }}
      </p>

      <div v-if="isMounted" class="click-exercise__result">
        <template v-if="collectedSlots.length > 0">
          <div v-for="slot in collectedSlots" :key="slot.index" class="click-exercise__result-slot">
            {{ slot.text }}
          </div>
        </template>
        <template v-else>
          {{ t('clickExercise.resultEmpty') }}
        </template>
      </div>

      <div v-if="isMounted && availableWords.length" class="click-exercise__words">
        <button
          v-for="word in availableWords"
          :key="word.id"
          class="click-exercise__word"
          :class="{
            'click-exercise__word_error': word.id === errorWordId,
            'click-exercise__word_hint': word.id === hintWordId,
          }"
          type="button"
          :disabled="isInteractionBlocked"
          @click="handleWordClick(word.id)"
        >
          {{ word.text }}
        </button>
      </div>

      <p
        v-if="checkState === 'success'"
        class="click-exercise__feedback click-exercise__feedback_success"
      >
        {{ t('clickExercise.feedbackSuccess') }}
      </p>
    </div>

    <p v-else class="click-exercise__empty">{{ t('clickExercise.empty') }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';

interface ThaiSentences {
  sentences: (string | null | undefined)[][];
}

type SubtitleText = Record<string, string | ThaiSentences | null | undefined>;

interface SubtitleItem {
  id?: number | string;
  start?: number | string | null;
  end?: number | string | null;
  text?: string | SubtitleText | ThaiSentences | null;
}

interface WordToken {
  id: string;
  text: string;
}

interface SentenceStep {
  id: string;
  words: WordToken[];
  start: number;
  end: number;
}

interface CollectedSlot {
  index: number;
  text: string;
}

interface HistoryWord {
  text: string;
  isCorrect: boolean;
}

interface HistoryItem {
  sentenceId: string;
  userWords: HistoryWord[];
  isCorrect: boolean;
}

const props = defineProps<{
  subtitles?: SubtitleItem[] | null;
  videoId?: string | number;
  showTranslation?: boolean;
}>();

const emit = defineEmits<{
  (e: 'range-change', payload: { start: number; end: number } | null): void;
}>();

const { locale, t } = useI18n();
const STORAGE_KEY = computed(() => {
  const videoId = props.videoId || 'default';
  return `click-exercise-progress-${videoId}`;
});

const history = ref<HistoryItem[]>([]);
const currentStepIndex = ref(0);
const collectedSlots = ref<CollectedSlot[]>([]);
const availableWords = ref<WordToken[]>([]);
const checkState = ref<'idle' | 'success'>('idle');
const completedSentences = ref<Set<string>>(new Set());
const isInitialized = ref(false);
const isMounted = ref(false);
const errorWordId = ref<string | null>(null);
const hintWordId = ref<string | null>(null);
const wrongClicksInRow = ref(0);
const isInteractionBlocked = ref(false);

const thaiWordSegmenter =
  typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter('th', { granularity: 'word' })
    : null;

const subtitleMap = computed(() => {
  const result = new Map<string, SubtitleItem>();
  (props.subtitles ?? []).forEach((item, index) => {
    if (!item) return;
    const key = `${item.id ?? index}`;
    result.set(key, item);
  });
  return result;
});

function segmentThaiText(text: string): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  if (thaiWordSegmenter) {
    const segments: string[] = [];
    for (const item of thaiWordSegmenter.segment(normalized)) {
      const value = item.segment.trim();
      if (!value) continue;
      if (item.isWordLike) segments.push(value);
    }
    if (segments.length) return segments;
  }

  const spaceSplit = normalized.split(' ').filter(Boolean);
  if (spaceSplit.length > 1) return spaceSplit;

  return Array.from(normalized).filter((symbol) => symbol.trim().length > 0);
}

function isThaiSentences(value: unknown): value is ThaiSentences {
  return !!value && typeof value === 'object' && Array.isArray((value as ThaiSentences).sentences);
}

function thaiSentencesToString(value: ThaiSentences | null): string {
  if (!value) return '';
  return value.sentences
    .map((sentence) => (Array.isArray(sentence) ? sentence.filter(Boolean).join(' ') : ''))
    .filter(Boolean)
    .join(' ');
}

function extractTranslation(text: SubtitleItem['text'], localeCode: string): string {
  if (!text) return '';
  if (typeof text === 'string') {
    return localeCode === 'th' ? text : '';
  }

  const textObject = text as SubtitleText;
  const candidate = textObject[localeCode];

  if (typeof candidate === 'string') {
    return candidate;
  }

  if (localeCode === 'th' && isThaiSentences(candidate)) {
    return thaiSentencesToString(candidate);
  }

  return '';
}

function getHistoryTranslation(sentenceId: string): string {
  const subtitle = subtitleMap.value.get(sentenceId);
  if (!subtitle) return '';
  const localeCode = locale.value;
  if (!localeCode) return '';
  return extractTranslation(subtitle.text, localeCode);
}

const historyWithTranslation = computed(() =>
  history.value.map((historyItem) => ({
    ...historyItem,
    translation: getHistoryTranslation(historyItem.sentenceId),
  }))
);

function normalizeWordsFromString(text: string, baseId: string) {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [] as WordToken[];
  const segmented = segmentThaiText(cleaned);
  return segmented.map((word, wordIndex) => ({
    id: `${baseId}-${wordIndex}`,
    text: word,
  }));
}

function normalizeWordsFromThaiSentences(value: ThaiSentences, baseId: string) {
  const tokens: WordToken[] = [];
  value.sentences.forEach((sentence, sentenceIndex) => {
    if (!Array.isArray(sentence)) return;
    sentence
      .map((word) => (typeof word === 'string' ? word.trim() : ''))
      .filter((word): word is string => !!word)
      .forEach((word, wordIndex) => {
        tokens.push({
          id: `${baseId}-${sentenceIndex}-${wordIndex}`,
          text: word,
        });
      });
  });
  return tokens;
}

function extractThaiSource(text: SubtitleItem['text']): string | ThaiSentences | null {
  if (!text) return null;
  if (typeof text === 'string') return text;
  if (isThaiSentences(text)) return text;
  if (typeof text === 'object') {
    const textObject = text as SubtitleText;
    const candidate = textObject.th ?? textObject['th-TH'] ?? textObject.th_th ?? null;
    if (typeof candidate === 'string') return candidate;
    if (isThaiSentences(candidate)) return candidate;
  }
  return null;
}

const sentences = computed<SentenceStep[]>(() => {
  const source = props.subtitles ?? [];
  const result: SentenceStep[] = [];

  source.forEach((item, index) => {
    const baseId = `${item.id ?? index}`;
    const thaiSource = extractThaiSource(item.text);
    if (!thaiSource) return;

    const startValue = Number(item.start ?? 0);
    const endValue = Number(item.end ?? 0);
    const start = Number.isFinite(startValue) ? Math.max(startValue, 0) : 0;
    const end = Number.isFinite(endValue) ? Math.max(endValue, 0) : 0;
    const hasValidRange = end > start;

    let words: WordToken[] = [];
    if (typeof thaiSource === 'string') {
      words = normalizeWordsFromString(thaiSource, baseId);
    } else if (isThaiSentences(thaiSource)) {
      words = normalizeWordsFromThaiSentences(thaiSource, baseId);
    }

    const filtered = words.filter((word) => !!word.text);
    if (!filtered.length) return;

    result.push({
      id: baseId,
      words: filtered,
      start: hasValidRange ? start : 0,
      end: hasValidRange ? end : Math.max(start + 0.1, start),
    });
  });

  return result;
});

const currentSentence = computed(() => sentences.value[currentStepIndex.value] ?? null);
const totalSteps = computed(() => sentences.value.length);
const hasNextStep = computed(() => currentStepIndex.value < totalSteps.value - 1);

const currentTranslation = computed(() => {
  if (!currentSentence.value || !props.showTranslation) return '';
  const subtitle = subtitleMap.value.get(currentSentence.value.id);
  if (!subtitle) return '';
  const localeCode = locale.value === 'ru' || locale.value === 'en' ? locale.value : 'en';
  return extractTranslation(subtitle.text, localeCode);
});

const progressLabel = computed(() => {
  const current = totalSteps.value ? currentStepIndex.value + 1 : 0;
  return t('clickExercise.progress', { current, total: totalSteps.value });
});

const completionLabel = computed(() => {
  const completed = completedSentences.value.size;
  const remaining = totalSteps.value - completed;
  return t('clickExercise.completion', { completed, remaining });
});

function loadProgress() {
  if (typeof window === 'undefined') return;

  try {
    const saved = localStorage.getItem(STORAGE_KEY.value);
    if (saved) {
      const data = JSON.parse(saved);
      if (data.completedSentences) {
        completedSentences.value = new Set(data.completedSentences);
      }
      if (data.history) {
        history.value = data.history;
      }
      if (typeof data.currentStepIndex === 'number') {
        currentStepIndex.value = data.currentStepIndex;
      }
    }
  } catch {
    // Игнорируем ошибки загрузки
  }
}

function saveProgress() {
  if (typeof window === 'undefined') return;

  try {
    const data = {
      completedSentences: Array.from(completedSentences.value),
      history: history.value,
      currentStepIndex: currentStepIndex.value,
    };
    localStorage.setItem(STORAGE_KEY.value, JSON.stringify(data));
  } catch {
    // Игнорируем ошибки сохранения
  }
}

onMounted(async () => {
  loadProgress();
  isInitialized.value = true;
  isMounted.value = true;
  await nextTick();
});

watch(
  () => props.videoId,
  () => {
    if (isInitialized.value) {
      loadProgress();
    }
  }
);

watch(
  currentSentence,
  (sentence, oldSentence) => {
    if (!sentence) {
      collectedSlots.value = [];
      availableWords.value = [];
      checkState.value = 'idle';
      emit('range-change', null);
      return;
    }

    const sentenceChanged = !oldSentence || oldSentence.id !== sentence.id;

    if (sentenceChanged) {
      collectedSlots.value = [];
      availableWords.value = shuffle(sentence.words.map((word) => ({ ...word })));
      checkState.value = 'idle';
      wrongClicksInRow.value = 0;
      errorWordId.value = null;
      hintWordId.value = null;
      emit('range-change', { start: sentence.start, end: sentence.end });
    }
  },
  { immediate: true }
);

watch(
  [completedSentences, history, currentStepIndex],
  () => {
    if (isInitialized.value) {
      saveProgress();
    }
  },
  { deep: true }
);

function shuffle(tokens: WordToken[]) {
  const temp = [...tokens];
  for (let i = temp.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const swap = temp[i]!;
    temp[i] = temp[j]!;
    temp[j] = swap;
  }
  return temp;
}

function handleWordClick(wordId: string) {
  if (!currentSentence.value || isInteractionBlocked.value) return;

  const nextIndex = collectedSlots.value.length;
  const correctWord = currentSentence.value.words[nextIndex];

  if (!correctWord) return;

  // Проверяем, правильное ли слово
  const clickedWord = availableWords.value.find((w) => w.id === wordId);
  if (!clickedWord) return;

  if (clickedWord.text === correctWord.text) {
    // Правильное слово
    wrongClicksInRow.value = 0;
    hintWordId.value = null;
    collectedSlots.value.push({
      index: nextIndex,
      text: clickedWord.text,
    });
    availableWords.value = availableWords.value.filter((w) => w.id !== wordId);

    // Проверяем, завершено ли предложение
    if (collectedSlots.value.length === currentSentence.value.words.length) {
      checkState.value = 'success';
      addToHistory(true);
      completedSentences.value.add(currentSentence.value.id);

      // Автоматически переходим к следующему предложению
      setTimeout(() => {
        if (hasNextStep.value) {
          currentStepIndex.value += 1;
        }
      }, 1500);
    }
  } else {
    // Неправильное слово - показываем ошибку
    errorWordId.value = wordId;
    wrongClicksInRow.value += 1;

    // Проверяем, нужно ли показать подсказку
    if (wrongClicksInRow.value >= 3) {
      const correctWordInAvailable = availableWords.value.find((w) => w.text === correctWord.text);
      if (correctWordInAvailable) {
        hintWordId.value = correctWordInAvailable.id;
      }
    }

    // Убираем анимацию ошибки через 600ms
    setTimeout(() => {
      errorWordId.value = null;
    }, 600);
  }
}

function addToHistory(isCorrect: boolean) {
  if (!currentSentence.value) return;

  const targetOrder = currentSentence.value.words.map((word) => word.text);
  const userWords: HistoryWord[] = collectedSlots.value.map((slot, index) => ({
    text: slot.text,
    isCorrect: slot.text === targetOrder[index],
  }));

  const existingIndex = history.value.findIndex(
    (item) => item.sentenceId === currentSentence.value!.id
  );
  if (existingIndex !== -1) {
    history.value.splice(existingIndex, 1);
  }

  history.value.unshift({
    sentenceId: currentSentence.value.id,
    userWords,
    isCorrect,
  });
}
</script>

<style scoped lang="scss">
@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  10%,
  30%,
  50%,
  70%,
  90% {
    transform: translateX(-4px);
  }
  20%,
  40%,
  60%,
  80% {
    transform: translateX(4px);
  }
}

@keyframes pulse-yellow {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(234, 179, 8, 0.7);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(234, 179, 8, 0);
  }
}

.click-exercise {
  display: flex;
  flex-direction: column;
  gap: 20px;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &__progress-wrapper {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
  }

  &__title {
    margin: 0;
    font-size: 20px;
  }

  &__progress {
    font-size: 14px;
    color: #555;
  }

  &__completion {
    font-size: 13px;
    color: #2563eb;
    font-weight: 600;
  }

  &__instruction {
    margin: 0;
    color: #333;
  }

  &__translation {
    margin: 0;
    padding: 12px 16px;
    background: #f0f9ff;
    border-left: 4px solid #3b82f6;
    border-radius: 6px;
    color: #1e40af;
    font-size: 16px;
    font-weight: 500;
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  &__result {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    min-height: 60px;
    padding: 16px;
    border: 2px dashed #cbd5f5;
    border-radius: 10px;
    background: #f8fbff;
  }

  &__result-slot {
    padding: 8px 14px;
    border: 2px solid #16a34a;
    border-radius: 10px;
    background: #dcfce7;
    font-size: 18px;
    color: #000;
  }

  &__words {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  &__word {
    padding: 8px 14px;
    border: 1px solid #94a3b8;
    border-radius: 10px;
    background: #fff;
    cursor: pointer;
    user-select: none;
    transition:
      background 0.2s ease,
      border 0.2s ease;

    &_error {
      animation: shake 0.6s ease;
      background: #fee;
      border-color: #dc2626;
      color: #dc2626;
    }

    &_hint {
      animation: pulse-yellow 2s infinite;
      background: #fef3c7;
      border-color: #eab308;
      color: #000;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }

    &:hover:not(:disabled):not(&_error):not(&_hint) {
      background: #f1f5f9;
    }
  }

  &__feedback {
    margin: 0;
    font-weight: 600;

    &_success {
      color: #16a34a;
    }
  }

  &__empty {
    margin: 0;
    color: #777;
  }

  &__history {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-top: 20px;
  }

  &__history-title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #333;
  }

  &__history-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  &__history-item {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__history-words {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  &__history-word {
    padding: 6px 12px;
    border: 2px solid #cbd5f5;
    border-radius: 10px;
    background: #f8fbff;
    font-size: 16px;

    &_correct {
      border-color: #16a34a;
      background: #dcfce7;
      color: #000;
    }

    &_error {
      border-color: #dc2626;
      background: #fee;
      color: #dc2626;
    }
  }

  &__history-translation {
    margin: 0;
    font-size: 16px;
    color: #1f2937;
  }
}
</style>
