<template>
  <div class="vocabulary-page">
    <div class="vocabulary-page__container">
      <h1 class="vocabulary-page__title">{{ t('vocabulary.title') }}</h1>

      <div v-if="pending" class="vocabulary-page__state">
        {{ t('vocabulary.loading') }}
      </div>

      <div v-else-if="error" class="vocabulary-page__state vocabulary-page__state_error">
        {{ t('vocabulary.error') }}
      </div>

      <div v-else-if="!vocabularyList.length" class="vocabulary-page__empty">
        <p class="vocabulary-page__empty-text">{{ t('vocabulary.empty') }}</p>
        <p class="vocabulary-page__empty-hint">{{ t('vocabulary.emptyHint') }}</p>
      </div>

      <div v-else class="vocabulary-page__content">
        <p class="vocabulary-page__count">
          {{ t('vocabulary.wordCount', { count: vocabularyList.length }) }}
        </p>

        <div class="vocabulary-page__list">
          <div v-for="word in vocabularyList" :key="word.id" class="vocabulary-card">
            <div class="vocabulary-card__header">
              <h3 class="vocabulary-card__word">{{ word.word_th }}</h3>
              <button
                class="vocabulary-card__remove-btn"
                type="button"
                @click="removeWord(word.id)"
              >
                {{ t('vocabulary.remove') }}
              </button>
            </div>

            <p v-if="word.transcription_en" class="vocabulary-card__transcription">
              {{ word.transcription_en }}
            </p>

            <div v-if="word.translation?.length" class="vocabulary-card__section">
              <h4 class="vocabulary-card__label">{{ t('dictionary.translation') }}</h4>
              <ul class="vocabulary-card__list">
                <li v-for="(trans, idx) in word.translation" :key="`trans-${idx}`">
                  {{ trans }}
                </li>
              </ul>
            </div>

            <div v-if="word.synonyms?.length" class="vocabulary-card__section">
              <h4 class="vocabulary-card__label">{{ t('dictionary.synonyms') }}</h4>
              <ul class="vocabulary-card__list">
                <li v-for="(syn, idx) in word.synonyms" :key="`syn-${idx}`">
                  {{ syn }}
                </li>
              </ul>
            </div>

            <div v-if="word.antonyms?.length" class="vocabulary-card__section">
              <h4 class="vocabulary-card__label">{{ t('dictionary.antonyms') }}</h4>
              <ul class="vocabulary-card__list">
                <li v-for="(ant, idx) in word.antonyms" :key="`ant-${idx}`">
                  {{ ant }}
                </li>
              </ul>
            </div>

            <div v-if="word.examples?.length" class="vocabulary-card__section">
              <h4 class="vocabulary-card__label">{{ t('dictionary.examples') }}</h4>
              <ul class="vocabulary-card__list">
                <li v-for="(example, idx) in word.examples" :key="`ex-${idx}`">
                  {{ formatExample(example) }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Json } from '~~/types/supabase';

definePageMeta({
  middleware: ['auth'],
  requiresAuth: true,
});

interface DictionaryExample {
  th?: string;
  ru?: string;
  en?: string;
  [key: string]: string | undefined;
}

interface DictionaryWord {
  id: number;
  word_th: string;
  translation: string[];
  transcription_en: string | null;
  synonyms: string[] | null;
  antonyms: string[] | null;
  examples: Json[] | null;
  links: string[] | null;
  created_at: string | null;
}

const { t } = useI18n();

const {
  data: vocabularyData,
  pending,
  error,
  refresh,
} = await useFetch<DictionaryWord[]>('/api/vocabulary');

const vocabularyList = computed(() => vocabularyData.value || []);

const formatExample = (value: Json | DictionaryExample) => {
  if (!value || typeof value !== 'object') return '';

  const parts: string[] = [];
  for (const key in value) {
    const val = (value as Record<string, unknown>)[key];
    if (typeof val === 'string' && val.trim()) {
      parts.push(val.trim());
    }
  }

  return parts.filter(Boolean).join(' — ');
};

const removeWord = async (id: number) => {
  try {
    await $fetch(`/api/vocabulary/${id}`, { method: 'DELETE' });
    await refresh();
  } catch {
    // Ignore errors silently
  }
};
</script>

<style scoped lang="scss">
.vocabulary-page {
  width: 100%;
  display: flex;
  justify-content: center;
  min-height: calc(100vh - 120px);

  &__container {
    width: min(1200px, 100%);
    padding: 2rem 1.5rem 3rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  &__title {
    margin: 0;
    font-size: 2rem;
    font-weight: 700;
    color: #0f172a;
  }

  &__state {
    text-align: center;
    padding: 3rem;
    font-size: 1.125rem;
    color: #64748b;

    &_error {
      color: #ef4444;
    }
  }

  &__empty {
    text-align: center;
    padding: 4rem 2rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  &__empty-text {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #475569;
  }

  &__empty-hint {
    margin: 0;
    font-size: 1rem;
    color: #64748b;
  }

  &__content {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  &__count {
    margin: 0;
    font-size: 1rem;
    color: #64748b;
    font-weight: 500;
  }

  &__list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
  }
}

.vocabulary-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: box-shadow 0.2s;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }

  &__word {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: #0f172a;
  }

  &__remove-btn {
    padding: 0.5rem 1rem;
    background-color: #ef4444;
    color: #fff;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
    white-space: nowrap;

    &:hover {
      background-color: #dc2626;
    }
  }

  &__transcription {
    margin: 0;
    font-size: 1rem;
    color: #64748b;
    font-style: italic;
  }

  &__section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  &__label {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #475569;
  }

  &__list {
    margin: 0;
    padding-left: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.875rem;
    color: #334155;

    li {
      line-height: 1.5;
    }
  }
}

@media (max-width: 768px) {
  .vocabulary-page {
    &__list {
      grid-template-columns: 1fr;
    }
  }
}
</style>
