<template>
  <div class="word-card">
    <div class="word-card__header">
      <div class="word-card__title-block">
        <h2 class="word-card__title">{{ word.word_th }}</h2>
        <p v-if="word.transcription_en" class="word-card__transcription">
          {{ word.transcription_en }}
        </p>
        <p v-if="word.translation" class="word-card__transcription">
          {{ getPrimaryTranslation(word.translation) }}
        </p>
      </div>
      <div class="word-card__actions">
        <UTooltip v-if="isInVocabulary" :text="t('vocabulary.remove')">
          <button
            class="word-card__action-btn word-card__action-btn_remove"
            type="button"
            @click="handleVocabularyToggle"
          >
            <UIcon name="i-lucide-trash-2" />
          </button>
        </UTooltip>
        <UTooltip v-else :text="t('vocabulary.add')">
          <button
            class="word-card__action-btn word-card__action-btn_add"
            type="button"
            @click="handleVocabularyToggle"
          >
            <UIcon name="i-lucide-circle-fading-plus" />
          </button>
        </UTooltip>
        <UTooltip v-if="canModerate" :text="t('dictionary.edit')">
          <button
            class="word-card__action-btn word-card__action-btn_edit"
            type="button"
            @click="handleEdit"
          >
            <UIcon name="i-lucide-pencil" />
          </button>
        </UTooltip>
      </div>
    </div>

    <button class="word-card__toggle-btn" type="button" @click="isExpanded = !isExpanded">
      <span>{{ isExpanded ? t('vocabulary.showLess') : t('vocabulary.showMore') }}</span>
      <ChevronIcon class="word-card__toggle-icon" :open="isExpanded" />
      <!-- <span
        
        :class="{ 'word-card__toggle-icon_expanded': isExpanded }"
      >
        ▼
      </span> -->
    </button>

    <Transition name="expand">
      <div v-show="isExpanded" class="word-card__content">
        <div v-if="word.translation?.length" class="word-card__section">
          <h3 class="word-card__section-title">{{ t('dictionary.translation') }}</h3>
          <ul class="word-card__list">
            <li v-for="(trans, idx) in word.translation" :key="`trans-${idx}`">
              {{ trans }}
            </li>
          </ul>
        </div>

        <!-- eslint-disable vue/attribute-hyphenation -->
        <WordCardSlider
          v-if="word.examples?.length"
          ref="examplesSlider"
          :title="t('dictionary.examples')"
          :items="word.examples"
          :ariaLabelPrev="t('dictionary.prevSlide', { section: t('dictionary.examples') })"
          :ariaLabelNext="t('dictionary.nextSlide', { section: t('dictionary.examples') })"
        >
          <!-- eslint-enable vue/attribute-hyphenation -->
          <template #item="{ item }">
            <div class="word-card__example-item">
              <p
                v-if="getExampleField(item as Json | DictionaryExample, 'text')"
                class="word-card__example-text word-card__example-text_thai"
              >
                {{ getExampleField(item as Json | DictionaryExample, 'text') }}
              </p>
              <p
                v-if="getExampleField(item as Json | DictionaryExample, 'translation')"
                class="word-card__example-text word-card__example-text_translation"
              >
                {{ getExampleField(item as Json | DictionaryExample, 'translation') }}
              </p>
            </div>
          </template>
        </WordCardSlider>

        <div v-if="word.synonyms?.length || word.antonyms?.length" class="word-card__grid">
          <!-- eslint-disable vue/attribute-hyphenation -->
          <WordCardSlider
            v-if="word.synonyms?.length"
            ref="synonymsSlider"
            :title="t('dictionary.synonyms')"
            :items="word.synonyms"
            :ariaLabelPrev="t('dictionary.prevSlide', { section: t('dictionary.synonyms') })"
            :ariaLabelNext="t('dictionary.nextSlide', { section: t('dictionary.synonyms') })"
          >
            <!-- eslint-enable vue/attribute-hyphenation -->
            <template #item="{ item }">
              <div class="word-card__tag-container">
                <span class="word-card__tag">{{ item }}</span>
              </div>
            </template>
          </WordCardSlider>

          <!-- eslint-disable vue/attribute-hyphenation -->
          <WordCardSlider
            v-if="word.antonyms?.length"
            ref="antonymsSlider"
            :title="t('dictionary.antonyms')"
            :items="word.antonyms"
            :ariaLabelPrev="t('dictionary.prevSlide', { section: t('dictionary.antonyms') })"
            :ariaLabelNext="t('dictionary.nextSlide', { section: t('dictionary.antonyms') })"
          >
            <!-- eslint-enable vue/attribute-hyphenation -->
            <template #item="{ item }">
              <div class="word-card__tag-container">
                <span class="word-card__tag">{{ item }}</span>
              </div>
            </template>
          </WordCardSlider>
        </div>

        <!-- eslint-disable vue/attribute-hyphenation -->
        <WordCardSlider
          v-if="word.links?.length"
          ref="linksSlider"
          :title="t('dictionary.links')"
          :items="word.links"
          :ariaLabelPrev="t('dictionary.prevSlide', { section: t('dictionary.links') })"
          :ariaLabelNext="t('dictionary.nextSlide', { section: t('dictionary.links') })"
        >
          <!-- eslint-enable vue/attribute-hyphenation -->
          <template #item="{ item }">
            <a
              :href="item as string"
              class="word-card__link-item"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div class="word-card__link-content">
                <span class="word-card__link-icon">🔗</span>
                <span class="word-card__link-text">{{ extractDomain(item as string) }}</span>
              </div>
              <span class="word-card__link-arrow">→</span>
            </a>
          </template>
        </WordCardSlider>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { nextTick, watch } from 'vue';
import type { Json } from '~~/types/supabase';
import WordCardSlider from './WordCardSlider.vue';
import ChevronIcon from '~/components/ui/icons/ChevronIcon.vue';

interface DictionaryExample {
  ref?: string;
  text?: string;
  roman?: string;
  english?: string;
  translation?: string;
}

interface WordData {
  id?: number;
  word_th: string;
  translation: string[];
  transcription_en: string | null;
  synonyms: string[] | null;
  antonyms: string[] | null;
  examples: Json[] | DictionaryExample[] | null;
  links: string[] | null;
}

interface Props {
  word: WordData;
  isInVocabulary?: boolean;
}

interface Emits {
  (e: 'toggle-vocabulary'): void;
  (e: 'edit'): void;
}

const props = withDefaults(defineProps<Props>(), {
  isInVocabulary: false,
});

const emit = defineEmits<Emits>();

const { t } = useI18n();
const { canModerate } = useUserRole();

const isExpanded = ref(false);

const examplesSlider = ref<InstanceType<typeof WordCardSlider> | undefined>();
const synonymsSlider = ref<InstanceType<typeof WordCardSlider> | undefined>();
const antonymsSlider = ref<InstanceType<typeof WordCardSlider> | undefined>();
const linksSlider = ref<InstanceType<typeof WordCardSlider> | undefined>();

watch(isExpanded, (newValue) => {
  if (newValue) {
    nextTick(() => {
      examplesSlider.value?.updateHeight();
      synonymsSlider.value?.updateHeight();
      antonymsSlider.value?.updateHeight();
      linksSlider.value?.updateHeight();
    });
  }
});

const getExampleField = (example: Json | DictionaryExample, field: string): string => {
  if (!example || typeof example !== 'object') return '';
  return ((example as Record<string, unknown>)[field] as string) || '';
};

const extractDomain = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
};

const getPrimaryTranslation = (translations: string[]): string => {
  if (!Array.isArray(translations) || translations.length === 0) {
    return '';
  }

  const firstItem = translations[0];

  if (typeof firstItem !== 'string') {
    return '';
  }

  return firstItem.split(';', 1)[0]?.trim() ?? '';
};

const handleVocabularyToggle = () => {
  emit('toggle-vocabulary');
};

const handleEdit = () => {
  emit('edit');
};
</script>

<style scoped lang="scss">
.word-card {
  width: 100%;
  max-width: 450px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  box-sizing: border-box;
  padding: 1.5rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;

  &__header {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #e5e7eb;

    @media (min-width: 640px) {
      flex-direction: row;
      align-items: flex-start;
    }
  }

  &__title-block {
    flex: 1;
  }

  &__title {
    margin: 0;
    font-size: 2.25rem;
    font-weight: 700;
    color: #111827;
    font-family: 'Noto Sans Thai', sans-serif;

    @media (min-width: 640px) {
      font-size: 3rem;
    }
  }

  &__transcription {
    margin: 0.25rem 0 0;
    font-size: 1.125rem;
    color: #6b7280;
  }

  &__actions {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
    flex-shrink: 0;
    width: 100%;

    @media (min-width: 640px) {
      flex-direction: row;
      align-items: center;
      width: auto;
    }
  }

  &__action-btn {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    border-radius: 6px;
    cursor: pointer;
    transition:
      background-color 0.2s,
      box-shadow 0.2s;
    border: none;
    white-space: nowrap;

    &:focus {
      outline: none;
      box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.3);
    }

    &_add {
      background-color: #14b8a6;
      color: #ffffff;

      &:hover {
        background-color: #0d9488;
      }
    }

    &_remove {
      background-color: #ef4444;
      color: #ffffff;

      &:hover {
        background-color: #dc2626;
      }
    }

    &_edit {
      padding: 0.5rem 1rem;
      background-color: transparent;
      border: 1px solid #e5e7eb;
      color: #111827;

      &:hover {
        background-color: #e5e7eb;
      }

      &:focus {
        box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.3);
      }
    }
  }

  &__section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  &__section-title {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 700;
    color: #111827;
  }

  &__list {
    margin: 0;
    padding-left: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;

    li {
      font-size: 1rem;
      color: #111827;
      line-height: 1.5;
      list-style-type: disc;

      &::marker {
        color: #14b8a6;
      }
    }
  }

  &__example-item {
    background: #f9fafb;
    padding: 1rem;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
  }

  &__example-text {
    margin: 0;
    word-wrap: break-word;
    overflow-wrap: break-word;

    &_thai {
      font-size: 1.125rem;
      color: #111827;
      font-family: 'Noto Sans Thai', sans-serif;
      line-height: 1.6;
    }

    &_translation {
      margin-top: 0.5rem;
      font-size: 1rem;
      color: #6b7280;
      line-height: 1.5;
    }
  }

  &__tag-container {
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    gap: 0.75rem;
    flex-wrap: wrap;
    padding: 0.5rem 0;
  }

  &__tag {
    font-family: 'Noto Sans Thai', sans-serif;
    background: #e5e7eb;
    color: #111827;
    padding: 0.5rem 1rem;
    border-radius: 9999px;
    font-size: 1rem;
    font-weight: 500;
    display: inline-block;
    white-space: nowrap;
    line-height: 1.4;

    &:focus {
      outline: none;
      box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.3);
    }
  }

  &__link-item {
    background: #f9fafb;
    padding: 1rem;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    text-decoration: none;
    transition: background-color 0.2s;
    min-height: 60px;

    &:hover {
      background: #f3f4f6;
    }

    &:focus {
      outline: none;
      box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.3);
    }
  }

  &__link-content {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  &__link-icon {
    font-size: 1.5rem;
  }

  &__link-text {
    font-size: 1rem;
    color: #111827;
    word-break: break-all;
    line-height: 1.4;
  }

  &__link-arrow {
    color: #6b7280;
    font-size: 1.25rem;
    transition: color 0.2s;

    .word-card__link-item:hover & {
      color: #14b8a6;
    }
  }

  &__grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;

    @media (min-width: 640px) {
      grid-template-columns: 1fr 1fr;
    }
  }

  &__toggle-btn {
    width: 100%;
    padding: 0.75rem 1rem;
    margin-top: 0.75rem;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    color: #111827;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;

    &:hover {
      background: #f3f4f6;
      border-color: #d1d5db;
    }

    &:focus {
      outline: none;
      box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.3);
    }
  }

  &__toggle-icon {
    transition: transform 0.3s ease;
    font-size: 0.75rem;

    &_expanded {
      transform: rotate(180deg);
    }
  }

  &__content {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  margin-top: 0;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 2000px;
  margin-top: 1rem;
}
</style>
