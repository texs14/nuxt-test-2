/**
 * Типы для новой структуры словаря
 * Основано на docs/new-dictionary-structure.md
 */

export type TranslationVariant = {
  text: string;
  register?: string;
  frequency?: number;
};

export type TranslationBlock = {
  language: 'en' | 'ru';
  variants: TranslationVariant[];
};

export type MediaAsset = {
  mediaId: string;
  url: string;
  start?: number;
  end?: number;
  captions?: Record<string, string>;
  thumbnail?: string;
  license?: string;
  type?: string;
  speaker?: string;
};

export type ExampleAlignment = {
  thToken: string;
  senseId: string;
  translationVariant: Record<string, string>;
};

export type ExampleItem = {
  exampleId: string;
  sentence: Record<string, string>;
  notes?: string[];
  alignments?: ExampleAlignment[];
  media?: {
    video?: MediaAsset[];
    audio?: MediaAsset[];
  };
};

export type Sense = {
  senseId: string;
  definition: Record<string, string>;
  usageLabels?: string[];
  translations: TranslationBlock[];
  examples?: ExampleItem[];
};

export type Headword = {
  script: string;
  romanization?: {
    paiboon?: string;
    ipa?: string;
  };
  audio?: MediaAsset[];
  partOfSpeech?: string;
  morphology?: {
    syllableCount?: number;
    tone?: string;
  };
};

export type Metadata = {
  frequency?: Record<string, number>;
  topics?: string[];
  sources?: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type RelatedEntry = {
  entryId: string;
  relationType: string;
  gloss?: Record<string, string>;
};

export type Related = {
  homophones?: RelatedEntry[];
  compounds?: RelatedEntry[];
};

export type DictionaryEntry = {
  entryId: string;
  headword: Headword;
  metadata?: Metadata;
  senses: Sense[];
  related?: Related;
};

/**
 * Старая структура словаря (для обратной совместимости)
 */
export type LegacyDictionaryEntry = {
  id: number;
  word_th: string;
  translation: string[];
  transcription_en: string | null;
  synonyms: string[] | null;
  antonyms: string[] | null;
  examples: unknown[] | null;
  links: string[] | null;
  created_at: string | null;
};

/**
 * Упрощенная структура для UI компонентов
 */
export type SimplifiedWordData = {
  entryId: string;
  script: string;
  romanization?: string;
  primaryTranslation: string;
  translations: {
    language: 'en' | 'ru';
    variants: string[];
  }[];
  senses: Array<{
    id: string;
    definition: string;
    examples: Array<{
      thai: string;
      translation: string;
    }>;
  }>;
  audio?: MediaAsset[];
  topics?: string[];
  related?: {
    homophones: string[];
    compounds: string[];
  };
};
