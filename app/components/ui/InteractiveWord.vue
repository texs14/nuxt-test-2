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

    <Teleport to="body">
      <Transition name="interactive-word__popup">
        <div v-if="isOpen" ref="popupRef" class="interactive-word__popup" :style="popupStyle">
          <div v-if="state === 'loaded' && entry" class="interactive-word__popup_content">
            <header class="interactive-word__popup_header">
              <div class="interactive-word__popup_header-content">
                <h3 class="interactive-word__popup_title">{{ entry.word_th }}</h3>
                <p v-if="entry.transcription_en" class="interactive-word__popup_transcription">
                  {{ entry.transcription_en }}
                </p>
              </div>
              <div class="interactive-word__popup_actions">
                <button
                  class="interactive-word__popup_vocabulary-btn"
                  :class="{ 'interactive-word__popup_vocabulary-btn_active': inVocabulary }"
                  type="button"
                  :disabled="vocabularyLoading"
                  @click.stop="onToggleVocabulary"
                >
                  {{
                    inVocabulary
                      ? t('vocabulary.removeFromVocabulary')
                      : t('vocabulary.addToVocabulary')
                  }}
                </button>
                <button
                  class="interactive-word__popup_edit-btn"
                  type="button"
                  @click.stop="onOpenEditDialog"
                >
                  {{ t('dictionary.editWord') }}
                </button>
              </div>
            </header>

            <section class="interactive-word__popup_section">
              <h4 class="interactive-word__popup_label">{{ t('dictionary.translation') }}</h4>
              <ul class="interactive-word__popup_list">
                <li v-for="(item, idx) in entry.translation" :key="`translation-${idx}`">
                  {{ item }}
                </li>
              </ul>
            </section>

            <section v-if="entry.synonyms?.length" class="interactive-word__popup_section">
              <h4 class="interactive-word__popup_label">{{ t('dictionary.synonyms') }}</h4>
              <ul class="interactive-word__popup_list">
                <li v-for="(item, idx) in entry.synonyms" :key="`synonym-${idx}`">
                  {{ item }}
                </li>
              </ul>
            </section>

            <section v-if="entry.antonyms?.length" class="interactive-word__popup_section">
              <h4 class="interactive-word__popup_label">{{ t('dictionary.antonyms') }}</h4>
              <ul class="interactive-word__popup_list">
                <li v-for="(item, idx) in entry.antonyms" :key="`antonym-${idx}`">
                  {{ item }}
                </li>
              </ul>
            </section>

            <section v-if="entry.examples?.length" class="interactive-word__popup_section">
              <h4 class="interactive-word__popup_label">{{ t('dictionary.examples') }}</h4>
              <ul class="interactive-word__popup_list">
                <li v-for="(item, idx) in entry.examples" :key="`example-${idx}`">
                  <span>{{ formatExample(item) }}</span>
                </li>
              </ul>
            </section>

            <section v-if="entry.links?.length" class="interactive-word__popup_section">
              <h4 class="interactive-word__popup_label">{{ t('dictionary.links') }}</h4>
              <ul class="interactive-word__popup_list">
                <li v-for="link in entry.links" :key="link">
                  <a
                    :href="link"
                    class="interactive-word__popup_link"
                    rel="noopener"
                    target="_blank"
                  >
                    {{ link }}
                  </a>
                </li>
              </ul>
            </section>
          </div>

          <div v-else-if="state === 'loading'" class="interactive-word__popup_state">
            {{ t('dictionary.loading') }}
          </div>

          <div v-else-if="state === 'error'" class="interactive-word__popup_state">
            {{ t('dictionary.error') }}
          </div>

          <div v-else class="interactive-word__popup_state">
            <p class="interactive-word__popup_empty">{{ t('dictionary.empty') }}</p>
            <button
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

const props = defineProps<{ word: string }>();

const emit = defineEmits<{ (event: 'open-change', value: boolean): void }>();

const client = useSupabaseClient<Database>();

interface DictionaryExample {
  th?: string;
  ru?: string;
  en?: string;
  [key: string]: string | undefined;
}

type DictionaryRow = Database['public']['Tables']['dictionary']['Row'];
type DictionaryEntry = Omit<DictionaryRow, 'examples'> & { examples: DictionaryExample[] | null };
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

const mergeExampleArrays = (sources: (DictionaryExample[] | null | undefined)[]) => {
  const unique = new Set<string>();
  const result: DictionaryExample[] = [];
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

const extractStrings = (value: DictionaryExample | null | undefined): string[] => {
  if (value === null || value === undefined) return [];
  if (typeof value === 'string') return [value];
  if (typeof value === 'object' && !Array.isArray(value)) {
    return Object.values(value).filter(
      (v): v is string => typeof v === 'string' && v.trim().length > 0
    );
  }
  return [];
};

const triggerRef = ref<HTMLElement | null>(null);
const popupRef = ref<HTMLElement | null>(null);
const positionKey = ref(0);

const isOpen = ref(false);
const state = ref<'idle' | 'loading' | 'loaded' | 'not-found' | 'error'>('idle');
const entry = ref<DictionaryEntry | null>(null);
const isAddDialogOpen = ref(false);
const editId = ref<number | null>(null);
const inVocabulary = ref(false);
const vocabularyLoading = ref(false);

const { t } = useI18n();

const popupStyle = computed<Record<string, string> | undefined>(() => {
  if (!process.client) return undefined;
  if (!isOpen.value || !triggerRef.value) return undefined;

  const rect = triggerRef.value.getBoundingClientRect();
  const popup = popupRef.value;

  let top = rect.top + window.scrollY - 12;
  let placement: 'top' | 'bottom' = 'top';

  if (popup) {
    const popupHeight = popup.offsetHeight;
    if (rect.top - popupHeight < 8) {
      placement = 'bottom';
      top = rect.bottom + window.scrollY + 12;
    } else {
      top = rect.top + window.scrollY - popupHeight - 12;
    }
  }

  const left = rect.left + window.scrollX + rect.width / 2;

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
};

const onToggle = async () => {
  if (isOpen.value) {
    closePopup();
    return;
  }

  activeInstance.value = instanceId;
  isOpen.value = true;
  emit('open-change', true);

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

    const normalizedRows = rows.map((row) => {
      const normalizedEntry: DictionaryEntry = {
        ...row,
        examples: Array.isArray(row.examples) ? (row.examples as DictionaryExample[]) : null,
      };
      return normalizedEntry;
    });

    const translations = mergeStringArrays(normalizedRows.map((row) => row.translation));
    const synonyms = mergeStringArrays(normalizedRows.map((row) => row.synonyms));
    const links = mergeStringArrays(normalizedRows.map((row) => row.links));
    const antonyms = mergeStringArrays(normalizedRows.map((row) => row.antonyms));
    const examples = mergeExampleArrays(normalizedRows.map((row) => row.examples));

    const base = normalizedRows[0];
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

const formatExample = (value: DictionaryExample) => {
  const parts = extractStrings(value)
    .map((item) => item.trim())
    .filter(Boolean);
  const uniqueParts = Array.from(new Set(parts));
  return uniqueParts.join(' — ');
};

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
  if (!entry.value?.id || vocabularyLoading.value) return;

  vocabularyLoading.value = true;
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
  } finally {
    vocabularyLoading.value = false;
  }
};

onBeforeUnmount(() => {
  if (!process.client) return;
  document.removeEventListener('click', onClickOutside);
  document.removeEventListener('keydown', onEscape);
});

watch(isOpen, (value) => {
  if (!process.client) return;
  if (value) {
    document.addEventListener('click', onClickOutside);
    document.addEventListener('keydown', onEscape);
  } else {
    document.removeEventListener('click', onClickOutside);
    document.removeEventListener('keydown', onEscape);
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
    z-index: 1300;
    min-width: 240px;
    max-width: min(320px, 90vw);
    padding: 12px;
    background: rgb(238, 238, 238);
    color: #000;
    border-radius: 10px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.24);
    pointer-events: auto;

    &::after {
      content: '';
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      border: 8px solid transparent;
      border-top-color: rgba(14, 14, 14, 0.94);
      bottom: -16px;
    }

    &[style*='--interactive-word-placement: bottom']::after {
      border-top-color: transparent;
      border-bottom-color: rgba(14, 14, 14, 0.94);
      top: -16px;
      bottom: auto;
    }
  }

  &__popup_content {
    display: grid;
    gap: 12px;
  }

  &__popup_header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
  }

  &__popup_header-content {
    display: grid;
    gap: 4px;
    flex: 1;
  }

  &__popup_title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
  }

  &__popup_transcription {
    margin: 0;
    opacity: 0.8;
    font-size: 14px;
  }

  &__popup_actions {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__popup_vocabulary-btn {
    padding: 6px 12px;
    background-color: #4caf50;
    color: #fff;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
    white-space: nowrap;

    &:hover:not(:disabled) {
      background-color: #45a049;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    &_active {
      background-color: #f44336;

      &:hover:not(:disabled) {
        background-color: #da190b;
      }
    }
  }

  &__popup_edit-btn {
    padding: 6px 12px;
    background-color: #5bb5ff;
    color: #fff;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
    white-space: nowrap;

    &:hover {
      background-color: #3b9ae1;
    }
  }

  &__popup_section {
    display: grid;
    gap: 6px;
  }

  &__popup_label {
    margin: 0;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    opacity: 0.7;
  }

  &__popup_list {
    margin: 0;
    padding-left: 18px;
    display: grid;
    gap: 4px;
    font-size: 14px;
  }

  &__popup_link {
    color: #5bb5ff;
    text-decoration: underline;
  }

  &__popup_state {
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
    background-color: #5bb5ff;
    color: #fff;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover {
      background-color: #3b9ae1;
    }
  }
}
</style>
