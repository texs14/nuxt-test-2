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
          <VocabularyWordCard
            v-for="word in vocabularyList"
            :key="word.id"
            :word="word"
            :is-in-vocabulary="true"
            @toggle-vocabulary="removeWord(word.id)"
            @edit="editWord(word.id)"
          />
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

const removeWord = async (id: number) => {
  try {
    await $fetch(`/api/vocabulary/${id}`, { method: 'DELETE' });
    await refresh();
  } catch {
    // Ignore errors silently
  }
};

const editWord = (id: number) => {
  // TODO: Implement edit functionality
  navigateTo(`/dictionary/edit/${id}`);
};
</script>

<style scoped lang="scss">
.vocabulary-page {
  width: 100%;
  display: flex;
  justify-content: center;
  min-height: calc(100vh - 120px);

  &__container {
    width: min(1440px, 100%);
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
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    justify-content: flex-start;
  }
}
</style>
