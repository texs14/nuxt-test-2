<template>
  <div class="sentence-exercise">
    <header class="sentence-exercise__header">
      <h3 class="sentence-exercise__title">{{ t('subtitleExercise.title') }}</h3>
      <span class="sentence-exercise__progress">{{ progressLabel }}</span>
    </header>

    <div v-if="currentSentence" class="sentence-exercise__body">
      <p class="sentence-exercise__instruction">
        {{ t('subtitleExercise.instruction') }}
      </p>

      <div class="sentence-exercise__slots">
        <button
          v-for="slot in slots"
          :key="slot.index"
          class="sentence-exercise__slot"
          :class="{ 'sentence-exercise__slot_filled': !!slot.token }"
          :draggable="!!slot.token"
          type="button"
          @click="handleSlotClick(slot.index)"
          @dragover.prevent
          @drop="handleSlotDrop($event, slot.index)"
          @dragstart="handleSlotDragStart($event, slot.index)"
          @dragend="handleSlotDragEnd"
        >
          <span class="sentence-exercise__slot_text">{{ slot.token?.text || '\u2007' }}</span>
        </button>
      </div>

      <div v-if="availableTokens.length" class="sentence-exercise__words">
        <button
          v-for="token in availableTokens"
          :key="token.id"
          class="sentence-exercise__word"
          :class="{ 'sentence-exercise__word_active': activeTokenId === token.id }"
          type="button"
          draggable="true"
          @dragstart="handleWordDragStart($event, token.id)"
          @dragend="handleWordDragEnd"
          @click="handleWordClick(token.id)"
        >
          {{ token.text }}
        </button>
      </div>
      <p v-else class="sentence-exercise__all_used">
        {{ t('subtitleExercise.allUsed') }}
      </p>

      <footer class="sentence-exercise__controls">
        <button
          class="sentence-exercise__check"
          type="button"
          :disabled="!isReadyToCheck"
          @click="handleCheck"
        >
          {{ t('subtitleExercise.check') }}
        </button>

        <button
          v-if="checkState === 'success' && hasNextStep"
          class="sentence-exercise__next"
          type="button"
          @click="goToNext"
        >
          {{ t('subtitleExercise.next') }}
        </button>
        <button
          v-else-if="checkState === 'success' && !hasNextStep"
          class="sentence-exercise__finish"
          type="button"
          @click="restartExercise"
        >
          {{ t('subtitleExercise.restart') }}
        </button>
      </footer>

      <p
        v-if="checkState === 'success'"
        class="sentence-exercise__feedback sentence-exercise__feedback_success"
      >
        {{ t('subtitleExercise.feedbackSuccess') }}
      </p>
      <p
        v-else-if="checkState === 'error'"
        class="sentence-exercise__feedback sentence-exercise__feedback_error"
      >
        {{ t('subtitleExercise.feedbackError') }}
      </p>
    </div>

    <p v-else class="sentence-exercise__empty">
      {{ t('subtitleExercise.empty') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
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

interface WordSlot {
  index: number;
  token: WordToken | null;
}

const props = defineProps<{ subtitles?: SubtitleItem[] | null }>();

const emit = defineEmits<{
  (e: 'range-change', payload: { start: number; end: number } | null): void;
}>();

const { t } = useI18n();

const activeTokenId = ref<string | null>(null);
const draggedTokenId = ref<string | null>(null);
const draggedFromSlotIndex = ref<number | null>(null);
const checkState = ref<'idle' | 'success' | 'error'>('idle');
const currentStepIndex = ref(0);
const slots = ref<WordSlot[]>([]);
const availableTokens = ref<WordToken[]>([]);
const thaiWordSegmenter =
  typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter('th', { granularity: 'word' })
    : null;

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
const progressLabel = computed(() =>
  t('subtitleExercise.progress', {
    current: totalSteps.value ? currentStepIndex.value + 1 : 0,
    total: totalSteps.value,
  })
);

watch(
  currentSentence,
  (sentence) => {
    if (!sentence) {
      slots.value = [];
      availableTokens.value = [];
      activeTokenId.value = null;
      checkState.value = 'idle';
      emit('range-change', null);
      return;
    }
    const tokens = sentence.words.map((word) => ({ ...word }));
    slots.value = sentence.words.map((_, index) => ({ index, token: null }));
    availableTokens.value = shuffle(tokens);
    activeTokenId.value = null;
    checkState.value = 'idle';
    emit('range-change', { start: sentence.start, end: sentence.end });
  },
  { immediate: true }
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

function takeTokenFromAvailable(tokenId: string): WordToken | null {
  const index = availableTokens.value.findIndex((token) => token.id === tokenId);
  if (index === -1) return null;
  const [token] = availableTokens.value.splice(index, 1);
  return token ?? null;
}

function returnTokenToAvailable(token: WordToken | null) {
  if (!token) return;
  availableTokens.value.push(token);
}

function placeTokenInSlot(
  slotIndex: number,
  tokenId: string,
  sourceSlotIndex: number | null = null
) {
  const targetSlot = slots.value[slotIndex];
  if (!targetSlot) return false;

  if (sourceSlotIndex === slotIndex) {
    draggedFromSlotIndex.value = null;
    draggedTokenId.value = null;
    return true;
  }

  let token: WordToken | null = null;

  if (sourceSlotIndex !== null) {
    const sourceSlot = slots.value[sourceSlotIndex];
    if (!sourceSlot || !sourceSlot.token || sourceSlot.token.id !== tokenId) {
      return false;
    }
    token = sourceSlot.token;
    sourceSlot.token = null;
  } else {
    token = takeTokenFromAvailable(tokenId);
    if (!token) return false;
  }

  if (targetSlot.token) {
    returnTokenToAvailable(targetSlot.token);
  }
  targetSlot.token = token;
  activeTokenId.value = null;
  draggedTokenId.value = null;
  draggedFromSlotIndex.value = null;
  checkState.value = 'idle';
  return true;
}

function handleWordClick(tokenId: string) {
  activeTokenId.value = activeTokenId.value === tokenId ? null : tokenId;
}

function handleSlotClick(slotIndex: number) {
  if (activeTokenId.value) {
    placeTokenInSlot(slotIndex, activeTokenId.value);
    return;
  }
  const slot = slots.value[slotIndex];
  if (!slot || !slot.token) return;
  returnTokenToAvailable(slot.token);
  slot.token = null;
  checkState.value = 'idle';
}

function handleWordDragStart(event: DragEvent, tokenId: string) {
  draggedTokenId.value = tokenId;
  draggedFromSlotIndex.value = null;
  event.dataTransfer?.setData('text/plain', tokenId);
  event.dataTransfer?.setDragImage(event.currentTarget as HTMLElement, 10, 10);
}

function handleWordDragEnd() {
  draggedTokenId.value = null;
}

function handleSlotDragStart(event: DragEvent, slotIndex: number) {
  const slot = slots.value[slotIndex];
  if (!slot?.token) return;
  draggedTokenId.value = slot.token.id;
  draggedFromSlotIndex.value = slotIndex;
  activeTokenId.value = null;
  event.dataTransfer?.setData('text/plain', `slot|${slotIndex}|${slot.token.id}`);
  event.dataTransfer?.setDragImage(event.currentTarget as HTMLElement, 10, 10);
}

function handleSlotDragEnd() {
  draggedTokenId.value = null;
  draggedFromSlotIndex.value = null;
}

function handleSlotDrop(event: DragEvent, slotIndex: number) {
  const data = event.dataTransfer?.getData('text/plain') || '';
  let tokenId = draggedTokenId.value;
  let sourceSlotIndex: number | null = draggedFromSlotIndex.value;

  if (data.startsWith('slot|')) {
    const parts = data.split('|');
    const derivedIndex = Number(parts[1]);
    if (!Number.isNaN(derivedIndex)) sourceSlotIndex = derivedIndex;
    tokenId = parts[2] || tokenId;
  } else if (data) {
    tokenId = data;
  }

  if (!tokenId) return;

  placeTokenInSlot(slotIndex, tokenId, sourceSlotIndex);
}

const isReadyToCheck = computed(() => slots.value.every((slot) => slot.token !== null));

function handleCheck() {
  if (!currentSentence.value || !isReadyToCheck.value) return;
  const currentOrder = slots.value.map((slot) => slot.token?.text ?? '');
  const targetOrder = currentSentence.value.words.map((word) => word.text);
  const isCorrect = currentOrder.every((word, index) => word === targetOrder[index]);
  checkState.value = isCorrect ? 'success' : 'error';
}

function goToNext() {
  if (!hasNextStep.value) return;
  currentStepIndex.value += 1;
}

function restartExercise() {
  currentStepIndex.value = 0;
}
</script>

<style scoped lang="scss">
.sentence-exercise {
  display: flex;
  flex-direction: column;
  gap: 20px;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &__title {
    margin: 0;
    font-size: 20px;
  }

  &__progress {
    font-size: 14px;
    color: #555;
  }

  &__instruction {
    margin: 0;
    color: #333;
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  &__slots {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  &__slot {
    min-width: 60px;
    min-height: 44px;
    padding: 6px 12px;
    border: 2px dashed #cbd5f5;
    border-radius: 10px;
    background: #f8fbff;
    cursor: pointer;
    transition: background 0.2s ease;

    &_filled {
      border-style: solid;
      background: #e0f2fe;
    }
  }

  &__slot_text {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    font-size: 18px;
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

    &_active {
      border-color: #2563eb;
      background: #e0e7ff;
    }
  }

  &__all_used {
    margin: 0;
    color: #2563eb;
  }

  &__controls {
    display: flex;
    gap: 12px;
  }

  &__check,
  &__next,
  &__finish {
    padding: 8px 16px;
    border: none;
    border-radius: 10px;
    background: #2563eb;
    color: #fff;
    cursor: pointer;
    transition: background 0.2s ease;

    &:disabled {
      background: #94a3b8;
      cursor: not-allowed;
    }
  }

  &__next,
  &__finish {
    background: #0ea5e9;
  }

  &__feedback {
    margin: 0;
    font-weight: 600;

    &_success {
      color: #16a34a;
    }

    &_error {
      color: #dc2626;
    }
  }

  &__empty {
    margin: 0;
    color: #777;
  }
}
</style>
