<template>
  <span ref="triggerRef" class="interactive-word">
    <button
      class="interactive-word__word"
      type="button"
      @click.stop="onToggle"
      @keydown.enter.prevent.stop="onToggle"
    >
      {{ word }}
    </button>

    <Teleport :to="teleportTarget">
      <Transition name="interactive-word__popup">
        <div v-if="isOpen" ref="popupRef" class="interactive-word__popup" :style="popupStyle">
          <div v-if="state === 'loaded' && entry" class="interactive-word__audio-controls">
            <!-- Кнопка воспроизведения, если аудио уже есть -->
            <UButton
              v-if="hasValidAudio(entry.headword)"
              class="interactive-word__popup_add-btn"
              type="button"
              :disabled="isPlayingAudio"
              @click="isPlayingAudio ? onStopAudio() : onPlayAudio()"
            >
              {{ isPlayingAudio ? '⏸ Остановить' : '▶ Воспроизвести аудио' }}
            </UButton>

            <!-- Кнопка синтеза, если аудио отсутствует -->
            <UButton
              v-if="
                needsSynthesis({
                  entryId: entry.entryId,
                  headword: entry.headword,
                  senses: entry.senses,
                })
              "
              class="interactive-word__popup_add-btn"
              type="button"
              :disabled="isSynthesizing"
              @click="onSynthesizeAudio"
            >
              {{ isSynthesizing ? getSynthesisStatusText() : 'Синтезировать аудио' }}
            </UButton>
            <div v-if="synthesisError" class="interactive-word__synthesis-error">
              {{ synthesisError }}
            </div>
          </div>
          <VocabularyWordCard
            v-if="state === 'loaded' && entry"
            :word="entry"
            :is-in-vocabulary="inVocabulary"
            @toggle-vocabulary="onToggleVocabulary"
            @edit="onOpenEditDialog"
          />

          <div v-else-if="state === 'loading'" class="interactive-word__popup_state">
            {{ t('dictionary.loading') }}
          </div>

          <div v-else-if="state === 'error'" class="interactive-word__popup_state">
            {{ t('dictionary.error') }}
          </div>

          <div v-else class="interactive-word__popup_state">
            <GenerationProgress
              v-if="isGenerating"
              :progress="generationProgress"
              :error="generationError"
              @retry="onOpenAddDialog"
            />
            <template v-else>
              <p class="interactive-word__popup_empty">{{ t('dictionary.empty') }}</p>
              <button
                v-if="canModerate"
                class="interactive-word__popup_add-btn"
                type="button"
                @click.stop="onOpenAddDialog"
              >
                {{ t('dictionary.addWord') }}
              </button>
            </template>
          </div>
        </div>
      </Transition>
    </Teleport>

    <AddWordDialog
      :is-open="isEditDialogOpen"
      :word="props.word"
      :edit-id="editId"
      @close="onCloseEditDialog"
      @saved="onWordSaved"
    />
  </span>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { DictionaryEntry } from '../../types/dictionary';
import { hasValidAudio } from '~~/utils/audio-manager';
import AddWordDialog from '~/components/ui/AddWordDialog.vue';
import VocabularyWordCard from '~/components/VocabularyWordCard.vue';
import GenerationProgress from '~/components/ui/GenerationProgress.vue';

const props = defineProps<{ word: string }>();

const emit = defineEmits<{ (event: 'open-change', value: boolean): void }>();

const { canModerate } = useUserRole();
const { t } = useI18n();

// Composable для синтеза аудио
const {
  synthesizeById,
  isSynthesizing,
  synthesisError,
  progress: synthesisProgress,
  needsSynthesis,
  clearError: clearSynthesisError,
} = useAudioSynthesis({
  voiceUuid: '6e922b40', // TODO: Заменить на реальный UUID тайского голоса
  sampleRate: 44100,
  outputFormat: 'wav',
});

// CRUD composable для работы со словарём
const dictionaryCrud = useSupabaseCrud({ table: 'new_dictionar' });
type DictionaryCacheState = Record<string, DictionaryEntry | null>;

const cache = useState<DictionaryCacheState>('dictionary-cache', () => {
  return {} as DictionaryCacheState;
});

const instanceId = Symbol('interactive-word');
const activeInstance = useState<symbol | null>('interactive-word-active', () => null);

const triggerRef = ref<HTMLElement | null>(null);
const popupRef = ref<HTMLElement | null>(null);
const positionKey = ref(0);
const fullscreenKey = ref(0);

const isOpen = ref(false);
const state = ref<'idle' | 'loading' | 'loaded' | 'not-found' | 'error'>('idle');
const entry = ref<DictionaryEntry | null>(null);
const editId = ref<string | null>(null);
const inVocabulary = ref(false);
const isPlayingAudio = ref(false);
const currentAudio = ref<HTMLAudioElement | null>(null);
const isGenerating = ref(false);
const generationProgress = ref<'generating' | 'synthesizing' | 'saving' | 'done'>('generating');
const generationError = ref<string | null>(null);
const isEditDialogOpen = ref(false);

const getFullscreenElement = (): Element | null => {
  if (!process.client) return null;
  return (
    document.fullscreenElement ||
    (document as any).webkitFullscreenElement ||
    (document as any).mozFullScreenElement ||
    (document as any).msFullscreenElement ||
    null
  );
};

const teleportTarget = computed(() => {
  if (!process.client) return 'body';
  void fullscreenKey.value;
  const fullscreenEl = getFullscreenElement();
  if (fullscreenEl && triggerRef.value) {
    if (fullscreenEl.contains(triggerRef.value)) {
      return fullscreenEl;
    }
  }
  return 'body';
});

const popupStyle = computed<Record<string, string> | undefined>(() => {
  if (!process.client) return undefined;
  if (!isOpen.value || !triggerRef.value) return undefined;

  const rect = triggerRef.value.getBoundingClientRect();
  const popup = popupRef.value;
  const fullscreenEl = getFullscreenElement();
  const isInFullscreen = fullscreenEl && fullscreenEl.contains(triggerRef.value);

  let top = rect.top - 12;
  let left = rect.left + rect.width / 2;
  let placement: 'top' | 'bottom' = 'top';

  if (!isInFullscreen) {
    top += window.scrollY;
    left += window.scrollX;
  }

  if (popup) {
    const popupHeight = popup.offsetHeight;
    if (rect.top - popupHeight < 8) {
      placement = 'bottom';
      top = rect.bottom + 12;
      if (!isInFullscreen) {
        top += window.scrollY;
      }
    } else {
      top = rect.top - popupHeight - 12;
      if (!isInFullscreen) {
        top += window.scrollY;
      }
    }
  }

  return {
    top: `${top}px`,
    left: `${left}px`,
    transform: 'translateX(-50%)',
    '--interactive-word-placement': placement,
    '--interactive-word-key': String(positionKey.value),
  };
});

interface CloseOptions {
  silent?: boolean;
}

const closePopup = (options?: CloseOptions) => {
  if (!isOpen.value) return;
  isOpen.value = false;
  state.value = 'idle';
  emit('open-change', false);
  dictionaryCrud.clearError();
  if (!options?.silent && activeInstance.value === instanceId) {
    activeInstance.value = null;
  }
};

const updatePosition = () => {
  if (!isOpen.value) return;
  positionKey.value += 1;
  fullscreenKey.value += 1;
};

const onToggle = async () => {
  if (isOpen.value) {
    closePopup();
    return;
  }

  activeInstance.value = instanceId;
  isOpen.value = true;
  emit('open-change', true);
  fullscreenKey.value += 1;

  // Очистка предыдущих ошибок
  dictionaryCrud.clearError();

  const normalizedWord = props.word.trim();
  const cached = cache.value[normalizedWord];

  if (cached !== undefined) {
    entry.value = cached;
    state.value = cached ? 'loaded' : 'not-found';
    await checkVocabulary();
    await nextTick();
    updatePosition();
    return;
  }

  try {
    state.value = 'loading';

    // Запрос через useSupabaseCrud
    const result = await dictionaryCrud.select(
      { 'headword->>script': normalizedWord },
      { limit: 1 }
    );

    // Проверка ошибки
    if (dictionaryCrud.error.value) {
      cache.value[normalizedWord] = null;
      entry.value = null;
      state.value = 'error';
      await nextTick();
      updatePosition();
      return;
    }

    // Преобразование результата (массив -> объект)
    const data = result?.[0];

    if (!data) {
      cache.value[normalizedWord] = null;
      entry.value = null;
      state.value = 'not-found';
      await nextTick();
      updatePosition();
      return;
    }

    // Формирование DictionaryEntry
    const loadedEntry: DictionaryEntry = {
      entryId: data.entry_id,
      headword: data.headword as any,
      metadata: data.metadata as any,
      senses: data.senses as any,
      related: data.related as any,
    };

    cache.value[normalizedWord] = loadedEntry;
    entry.value = loadedEntry;
    state.value = 'loaded';
    await checkVocabulary();
    await nextTick();
    updatePosition();
  } catch {
    entry.value = null;
    state.value = 'error';
    await nextTick();
    updatePosition();
  }
};

const onClickOutside = (event: MouseEvent) => {
  const target = event.target as Node | null;
  if (!isOpen.value) return;
  if (triggerRef.value?.contains(target) || popupRef.value?.contains(target)) return;
  closePopup();
};

const onEscape = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    closePopup();
  }
};

watch(
  () => props.word,
  () => {
    if (isOpen.value) closePopup();
  }
);

watch(activeInstance, (value) => {
  if (value !== instanceId && isOpen.value) {
    closePopup({ silent: true });
  }
});

const onOpenAddDialog = async () => {
  if (isGenerating.value) return;

  isGenerating.value = true;
  generationError.value = null;
  generationProgress.value = 'generating';

  try {
    const response = await $fetch('/api/dictionary/generate', {
      method: 'POST',
      body: {
        word: props.word.trim(),
      },
    });

    if (response.success) {
      generationProgress.value = 'done';

      // Обновляем кэш
      const normalizedWord = props.word.trim();
      delete cache.value[normalizedWord];

      // Небольшая задержка для показа успеха
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Закрываем popup и открываем снова с новыми данными
      closePopup();
      await nextTick();
      await onToggle();
    }
  } catch (error: any) {
    generationError.value =
      error.data?.statusMessage || error.message || 'Ошибка генерации словарной записи';
    generationProgress.value = 'generating';
  } finally {
    isGenerating.value = false;
  }
};

const onOpenEditDialog = () => {
  if (entry.value?.entryId) {
    editId.value = entry.value.entryId;
    isEditDialogOpen.value = true;
  }
};

const onCloseEditDialog = () => {
  isEditDialogOpen.value = false;
  editId.value = null;
};

const onWordSaved = async () => {
  const normalizedWord = props.word.trim();
  delete cache.value[normalizedWord];

  isEditDialogOpen.value = false;
  closePopup();

  await nextTick();
  await onToggle();
};

const checkVocabulary = async () => {
  if (!entry.value?.entryId) return;
  try {
    const data = await $fetch('/api/vocabulary/check', {
      params: { entry_id: entry.value.entryId },
    });
    inVocabulary.value = data?.inVocabulary || false;
  } catch {
    inVocabulary.value = false;
  }
};

const onToggleVocabulary = async () => {
  if (!entry.value?.entryId) return;

  try {
    if (inVocabulary.value) {
      await $fetch(`/api/vocabulary/${entry.value.entryId}`, { method: 'DELETE' });
      inVocabulary.value = false;
    } else {
      await $fetch('/api/vocabulary', {
        method: 'POST',
        body: { entry_id: entry.value.entryId },
      });
      inVocabulary.value = true;
    }
  } catch {
    // Ignore errors silently
  }
};

const getSynthesisStatusText = () => {
  switch (synthesisProgress.value) {
    case 'checking':
      return 'Проверка...';
    case 'synthesizing':
      return 'Синтез речи...';
    case 'saving':
      return 'Сохранение...';
    case 'done':
      return 'Готово';
    default:
      return 'Синтезировать аудио';
  }
};

const onPlayAudio = async () => {
  if (!entry.value || !hasValidAudio(entry.value.headword)) {
    return;
  }

  // Останавливаем предыдущее воспроизведение, если есть
  if (currentAudio.value) {
    currentAudio.value.pause();
    currentAudio.value = null;
  }

  // Находим первое валидное аудио с base64
  const audioAsset = entry.value.headword.audio?.find(
    (audio) => audio.base64 && audio.base64.length > 0
  );

  if (!audioAsset?.base64) {
    return;
  }

  try {
    isPlayingAudio.value = true;

    // Создаем Audio элемент из base64
    const audio = new Audio(audioAsset.base64);
    currentAudio.value = audio;

    audio.addEventListener('ended', () => {
      isPlayingAudio.value = false;
      currentAudio.value = null;
    });

    audio.addEventListener('error', () => {
      isPlayingAudio.value = false;
      currentAudio.value = null;
    });

    await audio.play();
  } catch (error) {
    isPlayingAudio.value = false;
    currentAudio.value = null;
  }
};

const onStopAudio = () => {
  if (currentAudio.value) {
    currentAudio.value.pause();
    currentAudio.value = null;
    isPlayingAudio.value = false;
  }
};

const onSynthesizeAudio = async () => {
  if (!entry.value) {
    return;
  }

  // Проверяем, нужен ли синтез
  const tempEntry = {
    entryId: entry.value.entryId,
    headword: entry.value.headword,
    senses: entry.value.senses,
  };

  if (!needsSynthesis(tempEntry)) {
    return;
  }

  // Синтезируем и сохраняем
  const success = await synthesizeById(entry.value.entryId, entry.value.headword);

  if (success) {
    // Обновляем кэш и перезагружаем слово
    const normalizedWord = props.word.trim();
    delete cache.value[normalizedWord];

    // Перезагружаем данные
    await onToggle();
    await nextTick();
    await onToggle();
  }
};

onBeforeUnmount(() => {
  if (!process.client) return;

  // Останавливаем аудио при размонтировании
  if (currentAudio.value) {
    currentAudio.value.pause();
    currentAudio.value = null;
  }

  document.removeEventListener('click', onClickOutside);
  document.removeEventListener('keydown', onEscape);
  document.removeEventListener('fullscreenchange', updatePosition);
  document.removeEventListener('webkitfullscreenchange', updatePosition);
  document.removeEventListener('mozfullscreenchange', updatePosition);
  document.removeEventListener('msfullscreenchange', updatePosition);
});

watch(isOpen, (value) => {
  if (!process.client) return;
  if (value) {
    document.addEventListener('click', onClickOutside);
    document.addEventListener('keydown', onEscape);
    document.addEventListener('fullscreenchange', updatePosition);
    document.addEventListener('webkitfullscreenchange', updatePosition);
    document.addEventListener('mozfullscreenchange', updatePosition);
    document.addEventListener('msfullscreenchange', updatePosition);
  } else {
    document.removeEventListener('click', onClickOutside);
    document.removeEventListener('keydown', onEscape);
    document.removeEventListener('fullscreenchange', updatePosition);
    document.removeEventListener('webkitfullscreenchange', updatePosition);
    document.removeEventListener('mozfullscreenchange', updatePosition);
    document.removeEventListener('msfullscreenchange', updatePosition);
  }
});
</script>

<style scoped lang="scss">
.interactive-word {
  position: relative;
  display: inline-block;

  &__word {
    background: none;
    border: none;
    padding: 2px 0;
    margin: 0;
    cursor: pointer;
    color: inherit;
    font: inherit;
    line-height: inherit;
    border-radius: 6px;
    position: relative;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    &::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 6px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      opacity: 0;
      transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: -1;
    }

    &:hover,
    &:focus-visible {
      color: #fff;
      transform: scale(1.05);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      outline: none;

      &::before {
        opacity: 1;
      }
    }
  }

  &__popup-enter-active,
  &__popup-leave-active {
    transition:
      opacity 0.15s ease,
      transform 0.15s ease;
  }

  &__popup-enter-from,
  &__popup-leave-to {
    opacity: 0;
    transform: translateX(-50%) scale(0.95);
  }

  &__popup {
    position: absolute;
    z-index: 9999999;
    min-width: 450px;
    pointer-events: auto;
  }

  &__popup_state {
    min-width: 240px;
    max-width: min(320px, 90vw);
    padding: 20px;
    background: #ffffff;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.24);
    font-size: 14px;
    text-align: center;
    opacity: 0.85;
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: center;
  }

  &__popup_empty {
    margin: 0;
  }

  &__popup_add-btn {
    padding: 8px 16px;
    background-color: #14b8a6;
    color: #fff;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover {
      background-color: #0d9488;
    }
  }
}
</style>
