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
import { useSupabaseClient } from '#imports';
import type { Database, Json } from '~~/types/supabase';
import AddWordDialog from '~/components/ui/AddWordDialog.vue';
import VocabularyWordCard from '~/components/VocabularyWordCard.vue';

const props = defineProps<{ word: string }>();

const emit = defineEmits<{ (event: 'open-change', value: boolean): void }>();

const client = useSupabaseClient<Database>();
const { canModerate } = useUserRole();

type DictionaryRow = Database['public']['Tables']['dictionary']['Row'];
type DictionaryEntry = DictionaryRow;
type DictionaryCacheState = Record<string, DictionaryEntry | null>;

const cache = useState<DictionaryCacheState>('dictionary-cache', () => {
  return {} as DictionaryCacheState;
});

const instanceId = Symbol('interactive-word');
const activeInstance = useState<symbol | null>('interactive-word-active', () => null);

const mergeStringArrays = (sources: (string[] | null | undefined)[]) => {
  const unique = new Set<string>();
  sources.forEach((list) => {
    if (!Array.isArray(list)) return;
    list.forEach((value) => {
      if (typeof value === 'string' && value.trim().length) {
        unique.add(value);
      }
    });
  });
  return Array.from(unique);
};

const mergeJsonArrays = (sources: (Json[] | null | undefined)[]) => {
  const unique = new Set<string>();
  const result: Json[] = [];
  sources.forEach((list) => {
    if (!Array.isArray(list)) return;
    list.forEach((value) => {
      if (!value) return;
      const key = JSON.stringify(value);
      if (!unique.has(key)) {
        unique.add(key);
        result.push(value);
      }
    });
  });
  return result.length ? result : null;
};

const triggerRef = ref<HTMLElement | null>(null);
const popupRef = ref<HTMLElement | null>(null);
const positionKey = ref(0);
const fullscreenKey = ref(0);

const isOpen = ref(false);
const state = ref<'idle' | 'loading' | 'loaded' | 'not-found' | 'error'>('idle');
const entry = ref<DictionaryEntry | null>(null);
const isAddDialogOpen = ref(false);
const editId = ref<number | null>(null);
const inVocabulary = ref(false);

const { t } = useI18n();

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
    const { data, error } = await client
      .from('dictionary')
      .select('*')
      .eq('word_th', normalizedWord)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const rows = (Array.isArray(data) ? data : data ? [data] : []) as DictionaryRow[];

    if (!rows.length) {
      cache.value[normalizedWord] = null;
      entry.value = null;
      state.value = 'not-found';
      await nextTick();
      updatePosition();
      return;
    }

    const translations = mergeStringArrays(rows.map((row) => row.translation));
    const synonyms = mergeStringArrays(rows.map((row) => row.synonyms));
    const links = mergeStringArrays(rows.map((row) => row.links));
    const antonyms = mergeStringArrays(rows.map((row) => row.antonyms));
    const examples = mergeJsonArrays(rows.map((row) => row.examples));

    const base = rows[0];
    if (!base) {
      cache.value[normalizedWord] = null;
      entry.value = null;
      state.value = 'not-found';
      await nextTick();
      updatePosition();
      return;
    }

    const aggregated: DictionaryEntry = {
      ...base,
      translation: translations.length ? translations : base.translation,
      synonyms: synonyms.length ? synonyms : base.synonyms,
      links: links.length ? links : base.links,
      antonyms: antonyms.length ? antonyms : base.antonyms,
      examples: examples ?? base.examples,
      id: base.id,
      word_th: base.word_th,
      created_at: base.created_at,
      transcription_en: base.transcription_en,
    };

    cache.value[normalizedWord] = aggregated;
    entry.value = aggregated;
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
  if (entry.value?.id) {
    editId.value = entry.value.id;
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
  if (!entry.value?.id) return;
  try {
    const data = await $fetch('/api/vocabulary/check', {
      params: { dictionary_id: entry.value.id },
    });
    inVocabulary.value = data?.inVocabulary || false;
  } catch {
    inVocabulary.value = false;
  }
};

const onToggleVocabulary = async () => {
  if (!entry.value?.id) return;

  try {
    if (inVocabulary.value) {
      await $fetch(`/api/vocabulary/${entry.value.id}`, { method: 'DELETE' });
      inVocabulary.value = false;
    } else {
      await $fetch('/api/vocabulary', {
        method: 'POST',
        body: { dictionary_id: entry.value.id },
      });
      inVocabulary.value = true;
    }
  } catch {
    // Ignore errors silently
  }
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
