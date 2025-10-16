<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="isOpen" class="dialog-overlay" @click.self="onClose">
        <div class="dialog">
          <header class="dialog__header">
            <h2 class="dialog__title">
              {{ editId ? t('dictionary.editWordForm') : t('dictionary.addWordForm') }}
            </h2>
            <button class="dialog__close" type="button" @click="onClose">×</button>
          </header>

          <form class="dialog__form" @submit.prevent="onSubmit">
            <div class="dialog__field">
              <label class="dialog__label" for="word_th">
                {{ t('dictionary.wordTh') }} <span class="dialog__required">*</span>
              </label>
              <input
                id="word_th"
                v-model="form.word_th"
                class="dialog__input"
                type="text"
                required
                :disabled="isSaving"
              />
            </div>

            <div class="dialog__field">
              <label class="dialog__label" for="translation">
                {{ t('dictionary.translationField') }} <span class="dialog__required">*</span>
              </label>
              <input
                id="translation"
                v-model="form.translation"
                class="dialog__input"
                type="text"
                required
                placeholder="слово1, слово2, слово3"
                :disabled="isSaving"
              />
            </div>

            <div class="dialog__field">
              <label class="dialog__label" for="transcription_en">
                {{ t('dictionary.transcriptionEn') }}
              </label>
              <input
                id="transcription_en"
                v-model="form.transcription_en"
                class="dialog__input"
                type="text"
                :disabled="isSaving"
              />
            </div>

            <div class="dialog__field">
              <label class="dialog__label" for="synonyms">
                {{ t('dictionary.synonymsField') }}
              </label>
              <input
                id="synonyms"
                v-model="form.synonyms"
                class="dialog__input"
                type="text"
                placeholder="синоним1, синоним2"
                :disabled="isSaving"
              />
            </div>

            <div class="dialog__field">
              <label class="dialog__label" for="antonyms">
                {{ t('dictionary.antonymsField') }}
              </label>
              <input
                id="antonyms"
                v-model="form.antonyms"
                class="dialog__input"
                type="text"
                placeholder="антоним1, антоним2"
                :disabled="isSaving"
              />
            </div>

            <div class="dialog__field">
              <label class="dialog__label" for="links">
                {{ t('dictionary.linksField') }}
              </label>
              <input
                id="links"
                v-model="form.links"
                class="dialog__input"
                type="text"
                placeholder="https://example.com, https://example2.com"
                :disabled="isSaving"
              />
            </div>

            <div class="dialog__field">
              <label class="dialog__label" for="examples">
                {{ t('dictionary.examplesField') }}
              </label>
              <textarea
                id="examples"
                v-model="form.examples"
                class="dialog__textarea"
                rows="4"
                placeholder='[{"th": "...", "ru": "..."}]'
                :disabled="isSaving"
              />
            </div>

            <div v-if="error" class="dialog__error">
              {{ error }}
            </div>

            <div class="dialog__actions">
              <button
                class="dialog__button dialog__button_secondary"
                type="button"
                :disabled="isSaving"
                @click="onClose"
              >
                {{ t('dictionary.cancel') }}
              </button>
              <button
                class="dialog__button dialog__button_primary"
                type="submit"
                :disabled="isSaving"
              >
                {{ isSaving ? t('dictionary.saving') : t('dictionary.save') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSupabaseClient } from '#imports';
import type { Database } from '~~/types/supabase';
import { generateEntryId, generateSenseId } from '../../../utils/dictionary-adapter';
import { getDictionaryLanguage } from '../../../utils/language-mapping';

const props = defineProps<{
  isOpen: boolean;
  word?: string;
  editId?: string | number | null;
}>();

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'saved'): void;
}>();

const client = useSupabaseClient<Database>();
const { t, locale } = useI18n();

// Определяем язык словаря на основе текущей локали
const dictionaryLanguage = computed<'ru' | 'en'>(() => {
  return getDictionaryLanguage(locale.value);
});

const form = ref({
  word_th: '',
  translation: '',
  transcription_en: '',
  synonyms: '',
  antonyms: '',
  links: '',
  examples: '',
});

const isSaving = ref(false);
const isLoading = ref(false);
const error = ref('');

const formatArrayToString = (arr: string[] | null | undefined): string => {
  return Array.isArray(arr) ? arr.join(', ') : '';
};

const formatExamplesToString = (examples: unknown): string => {
  if (!examples) return '';
  try {
    return JSON.stringify(examples, null, 2);
  } catch {
    return '';
  }
};

const resetForm = () => {
  form.value = {
    word_th: props.word || '',
    translation: '',
    transcription_en: '',
    synonyms: '',
    antonyms: '',
    links: '',
    examples: '',
  };
  error.value = '';
};

const loadWordData = async () => {
  if (!props.editId) return;

  isLoading.value = true;
  error.value = '';

  try {
    const isNewStructure = typeof props.editId === 'string';

    if (isNewStructure) {
      const { data, error: loadError } = await client
        .from('new_dictionar')
        .select('*')
        .eq('entry_id', props.editId)
        .single();

      if (loadError) throw loadError;

      if (data) {
        const headword = data.headword as any;
        const senses = data.senses as any[];
        const metadata = data.metadata as any;

        const allTranslations: string[] = [];
        senses.forEach((sense: any) => {
          sense.translations?.forEach((tb: any) => {
            // Используем только текущий язык, без fallback
            if (tb.language === dictionaryLanguage.value) {
              tb.variants?.forEach((v: any) => {
                if (v.text) allTranslations.push(v.text);
              });
            }
          });
        });

        form.value = {
          word_th: headword.script || '',
          translation: allTranslations.length > 0 ? allTranslations.join(', ') : '',
          transcription_en: headword.romanization?.paiboon || headword.romanization?.ipa || '',
          synonyms: '',
          antonyms: '',
          links: metadata?.sources?.join(', ') || '',
          examples: JSON.stringify(senses[0]?.examples || [], null, 2),
        };
      }
    } else {
      const { data, error: loadError } = await client
        .from('dictionary')
        .select('*')
        .eq('id', props.editId as number)
        .single();

      if (loadError) throw loadError;

      if (data) {
        form.value = {
          word_th: (data as { word_th?: string | null }).word_th || '',
          translation: formatArrayToString((data as { translation?: string[] | null }).translation),
          transcription_en: (data as { transcription_en?: string | null }).transcription_en || '',
          synonyms: formatArrayToString((data as { synonyms?: string[] | null }).synonyms),
          antonyms: formatArrayToString((data as { antonyms?: string[] | null }).antonyms),
          links: formatArrayToString((data as { links?: string[] | null }).links),
          examples: formatExamplesToString((data as { examples?: unknown }).examples),
        };
      }
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('dictionary.error');
  } finally {
    isLoading.value = false;
  }
};

watch(
  () => props.isOpen,
  async (value) => {
    if (value) {
      if (props.editId) {
        await loadWordData();
      } else {
        resetForm();
      }
    }
  }
);

watch(
  () => props.word,
  (value) => {
    if (props.isOpen && value && !props.editId) {
      form.value.word_th = value;
    }
  }
);

watch(
  () => props.editId,
  async (value) => {
    if (props.isOpen && value) {
      await loadWordData();
    }
  }
);

const parseArray = (value: string): string[] => {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const parseExamples = (value: string): unknown => {
  if (!value.trim()) return [];
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
};

const onSubmit = async () => {
  error.value = '';
  isSaving.value = true;

  try {
    const isNewStructure = typeof props.editId === 'string';
    let saveError;

    if (isNewStructure || !props.editId) {
      const entryId = props.editId || generateEntryId(form.value.word_th.trim());
      const senseId = generateSenseId(entryId as string, 0);

      const translations = parseArray(form.value.translation);
      const examples = parseExamples(form.value.examples);

      const newPayload = {
        entry_id: entryId,
        headword: {
          script: form.value.word_th.trim(),
          romanization: form.value.transcription_en
            ? { paiboon: form.value.transcription_en.trim() }
            : undefined,
        },
        metadata: {
          sources: parseArray(form.value.links),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        senses: [
          {
            senseId,
            definition: {
              [dictionaryLanguage.value]: translations[0] || '',
            },
            translations: [
              {
                language: dictionaryLanguage.value,
                variants: translations.map((text: string) => ({ text, register: 'neutral' })),
              },
            ],
            examples: Array.isArray(examples) ? examples : [],
          },
        ],
        related: {},
      };

      if (props.editId) {
        const result = await client
          .from('new_dictionar')
          .update(newPayload)
          .eq('entry_id', props.editId as string);
        saveError = result.error;
      } else {
        const result = await client.from('new_dictionar').insert(newPayload);
        saveError = result.error;
      }
    } else {
      const examples = parseExamples(form.value.examples);
      const payload = {
        word_th: form.value.word_th.trim(),
        translation: parseArray(form.value.translation),
        transcription_en: form.value.transcription_en.trim() || null,
        synonyms: parseArray(form.value.synonyms),
        antonyms: parseArray(form.value.antonyms),
        links: parseArray(form.value.links),
        examples: examples as never,
      };

      const result = await client
        .from('dictionary')
        .update(payload)
        .eq('id', props.editId as number);
      saveError = result.error;
    }

    if (saveError) {
      throw saveError;
    }

    emit('saved');
    emit('close');
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('dictionary.saveError');
  } finally {
    isSaving.value = false;
  }
};

const onClose = () => {
  if (!isSaving.value) {
    emit('close');
  }
};
</script>

<style scoped lang="scss">
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 1400;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  padding: 16px;
}

.dialog-enter-active,
.dialog-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;

  .dialog {
    transition: transform 0.2s ease;
  }
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;

  .dialog {
    transform: scale(0.95);
  }
}

.dialog {
  background: #fff;
  border-radius: 12px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid #e5e5e5;
  }

  &__title {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: #000;
  }

  &__close {
    background: none;
    border: none;
    font-size: 32px;
    line-height: 1;
    cursor: pointer;
    color: #666;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background-color 0.2s;

    &:hover {
      background-color: #f0f0f0;
    }
  }

  &__form {
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__label {
    font-size: 14px;
    font-weight: 500;
    color: #333;
  }

  &__required {
    color: #e53e3e;
  }

  &__input,
  &__textarea {
    padding: 10px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
    color: #000;
    transition: border-color 0.2s;

    &:focus {
      outline: none;
      border-color: #5bb5ff;
    }

    &:disabled {
      background-color: #f3f4f6;
      cursor: not-allowed;
    }
  }

  &__textarea {
    font-family: monospace;
    resize: vertical;
  }

  &__error {
    padding: 12px;
    background-color: #fee;
    border: 1px solid #fcc;
    border-radius: 6px;
    color: #c00;
    font-size: 14px;
  }

  &__actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    padding-top: 8px;
  }

  &__button {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    &_secondary {
      background-color: #f3f4f6;
      color: #374151;

      &:hover:not(:disabled) {
        background-color: #e5e7eb;
      }
    }

    &_primary {
      background-color: #5bb5ff;
      color: #fff;

      &:hover:not(:disabled) {
        background-color: #3b9ae1;
      }
    }
  }
}
</style>
