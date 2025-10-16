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
          <!-- <UiButton class="interactive-word__popup_add-btn" type="button" @click="onFetchWord">
            получить слово из супабазы
          </UiButton> -->
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
            <p class="interactive-word__popup_empty">{{ t('dictionary.empty') }}</p>
            <button
              v-if="canModerate"
              class="interactive-word__popup_add-btn"
              type="button"
              @click.stop="onOpenAddDialog"
            >
              {{ t('dictionary.addWord') }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <AddWordDialog
      :is-open="isAddDialogOpen"
      :word="props.word"
      :edit-id="editId"
      @close="onCloseAddDialog"
      @saved="onWordSaved"
    />
  </span>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { DictionaryEntry } from '../../types/dictionary';
import AddWordDialog from '~/components/ui/AddWordDialog.vue';
import VocabularyWordCard from '~/components/VocabularyWordCard.vue';

const props = defineProps<{ word: string }>();

const emit = defineEmits<{ (event: 'open-change', value: boolean): void }>();

const { canModerate } = useUserRole();
const { t } = useI18n();

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
const isAddDialogOpen = ref(false);
const editId = ref<string | null>(null);
const inVocabulary = ref(false);

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

const onOpenAddDialog = () => {
  editId.value = null;
  isAddDialogOpen.value = true;
};

const onOpenEditDialog = () => {
  if (entry.value?.entryId) {
    editId.value = entry.value.entryId;
    isAddDialogOpen.value = true;
  }
};

const onCloseAddDialog = () => {
  isAddDialogOpen.value = false;
  editId.value = null;
};

const onWordSaved = async () => {
  const normalizedWord = props.word.trim();
  delete cache.value[normalizedWord];

  isAddDialogOpen.value = false;
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

const onFetchWord = async () => {
  const normalizedWord = props.word.trim();
  console.log('Запрос слова:', normalizedWord);

  const result = await dictionaryCrud.select({ 'headword->>script': normalizedWord });

  console.log('Результат из Supabase:', result?.[0]);
  console.log('Ошибка:', dictionaryCrud.error.value);
  console.log('Загрузка:', dictionaryCrud.loading.value);
};

onBeforeUnmount(() => {
  if (!process.client) return;
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
    padding: 0;
    margin: 0;
    cursor: pointer;
    color: inherit;
    font: inherit;
    line-height: inherit;
    border-radius: 4px;
    transition: background-color 0.2s ease;

    &:hover,
    &:focus-visible {
      background-color: rgba(255, 255, 255, 0.2);
      outline: none;
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
