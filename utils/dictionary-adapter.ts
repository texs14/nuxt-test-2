import type {
  DictionaryEntry,
  LegacyDictionaryEntry,
  SimplifiedWordData,
  Sense,
  TranslationVariant,
  ExampleItem,
  Headword,
} from '../types/dictionary';

/**
 * Генерирует entry_id из тайского слова
 */
export function generateEntryId(script: string): string {
  // Простая транслитерация или использование самого слова
  return script.trim().toLowerCase().replace(/\s+/g, '-');
}

/**
 * Генерирует уникальный sense_id
 */
export function generateSenseId(entryId?: string, index?: number): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 7);
  if (entryId && index !== undefined) {
    return `${entryId}-sense-${index + 1}`;
  }
  return `sense-${timestamp}-${random}`;
}

/**
 * Генерирует уникальный example_id
 */
export function generateExampleId(senseId?: string, index?: number): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 7);
  if (senseId && index !== undefined) {
    return `${senseId}-ex${index + 1}`;
  }
  return `example-${timestamp}-${random}`;
}

/**
 * Конвертирует старую структуру словаря в новую
 */
export function convertLegacyToNew(legacy: LegacyDictionaryEntry): DictionaryEntry {
  const entryId = generateEntryId(legacy.word_th);

  // Создаем headword
  const headword: Headword = {
    script: legacy.word_th,
  };

  if (legacy.transcription_en) {
    headword.romanization = {
      paiboon: legacy.transcription_en,
    };
  }

  // Создаем основной sense из переводов
  const mainSense: Sense = {
    senseId: generateSenseId(entryId, 0),
    definition: {
      ru: legacy.translation?.[0] || '',
    },
    translations: [],
  };

  // Добавляем переводы
  if (legacy.translation && legacy.translation.length > 0) {
    const ruVariants: TranslationVariant[] = legacy.translation.map((text: string) => ({
      text,
      register: 'neutral',
    }));

    mainSense.translations.push({
      language: 'ru',
      variants: ruVariants,
    });
  }

  // Добавляем синонимы как дополнительные варианты перевода
  if (legacy.synonyms && legacy.synonyms.length > 0) {
    const synonymVariants: TranslationVariant[] = legacy.synonyms.map((text: string) => ({
      text,
      register: 'synonym',
    }));

    const ruBlock = mainSense.translations.find((t: any) => t.language === 'ru');
    if (ruBlock) {
      ruBlock.variants.push(...synonymVariants);
    }
  }

  // Конвертируем примеры
  if (legacy.examples && Array.isArray(legacy.examples)) {
    mainSense.examples = legacy.examples
      .filter((ex: any) => ex && typeof ex === 'object')
      .map((ex: any, idx: number | undefined) => {
        const exampleId = generateExampleId(mainSense.senseId, idx);
        const sentence: Record<string, string> = {};

        if (ex.text || ex.th) {
          sentence.th = ex.text || ex.th;
        }
        if (ex.translation || ex.ru) {
          sentence.ru = ex.translation || ex.ru;
        }
        if (ex.english || ex.en) {
          sentence.en = ex.english || ex.en;
        }

        return {
          exampleId,
          sentence,
          notes: ex.ref ? [ex.ref] : undefined,
        } as ExampleItem;
      });
  }

  // Создаем metadata
  const metadata = {
    sources: legacy.links || undefined,
    createdAt: legacy.created_at || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Создаем related для антонимов (храним в notes первого примера)
  // В идеале создать отдельные записи для антонимов
  const related = legacy.antonyms && legacy.antonyms.length > 0 ? {} : undefined;

  return {
    entryId,
    headword,
    metadata,
    senses: [mainSense],
    related,
  };
}

/**
 * Извлекает основной перевод из senses для указанного языка
 */
export function extractPrimaryTranslation(
  senses: Sense[],
  language: 'en' | 'ru' = 'ru',
  fallback: boolean = true
): string {
  if (!senses || senses.length === 0) return '';

  const firstSense = senses[0];
  if (!firstSense) return '';

  // Пытаемся найти перевод на запрошенном языке
  const translationBlock = firstSense.translations.find((t: any) => t.language === language);

  if (translationBlock && translationBlock.variants.length > 0) {
    const sortedVariants = [...translationBlock.variants].sort(
      (a, b) => (b.frequency || 0) - (a.frequency || 0)
    );
    return sortedVariants[0]?.text || '';
  }

  // Fallback: пробуем другой язык
  if (fallback) {
    const fallbackLang = language === 'ru' ? 'en' : 'ru';
    const fallbackBlock = firstSense.translations.find((t: any) => t.language === fallbackLang);
    if (fallbackBlock && fallbackBlock.variants.length > 0) {
      const sortedVariants = [...fallbackBlock.variants].sort(
        (a, b) => (b.frequency || 0) - (a.frequency || 0)
      );
      return sortedVariants[0]?.text || '';
    }
  }

  // Последняя попытка: определение на любом языке
  if (fallback && firstSense.definition) {
    return (
      firstSense.definition[language] ||
      firstSense.definition.en ||
      firstSense.definition.ru ||
      firstSense.definition.th ||
      ''
    );
  }

  return '';
}

/**
 * Собирает все переводы из всех senses
 */
export function getAllTranslations(
  senses: Sense[],
  language: 'en' | 'ru' = 'ru',
  fallback: boolean = true
): string[] {
  const translations: string[] = [];

  // Основной язык
  senses.forEach((sense) => {
    const block = sense.translations.find((t: any) => t.language === language);
    if (block) {
      block.variants.forEach((variant: any) => {
        if (variant.text && !translations.includes(variant.text)) {
          translations.push(variant.text);
        }
      });
    }
  });

  // Fallback если ничего не нашли
  if (fallback && translations.length === 0) {
    const fallbackLang = language === 'ru' ? 'en' : 'ru';
    senses.forEach((sense) => {
      const block = sense.translations.find((t) => t.language === fallbackLang);
      if (block) {
        block.variants.forEach((variant) => {
          if (variant.text && !translations.includes(variant.text)) {
            translations.push(variant.text);
          }
        });
      }
    });
  }

  return translations;
}

/**
 * Преобразует DictionaryEntry в упрощенную структуру для UI
 */
export function simplifyForUI(entry: DictionaryEntry): SimplifiedWordData {
  return {
    entryId: entry.entryId,
    script: entry.headword.script,
    romanization: entry.headword.romanization?.paiboon || entry.headword.romanization?.ipa,
    primaryTranslation: extractPrimaryTranslation(entry.senses, 'ru'),
    translations: [
      {
        language: 'ru' as const,
        variants: getAllTranslations(entry.senses, 'ru'),
      },
      {
        language: 'en' as const,
        variants: getAllTranslations(entry.senses, 'en'),
      },
    ].filter((t) => t.variants.length > 0),
    senses: entry.senses.map((sense) => ({
      id: sense.senseId,
      definition: sense.definition.ru || sense.definition.en || sense.definition.th || '',
      examples:
        sense.examples?.map((ex) => ({
          thai: ex.sentence.th || '',
          translation: ex.sentence.ru || ex.sentence.en || '',
        })) || [],
    })),
    audio: entry.headword.audio,
    topics: entry.metadata?.topics,
    related: entry.related
      ? {
          homophones: entry.related.homophones?.map((h) => h.entryId) || [],
          compounds: entry.related.compounds?.map((c) => c.entryId) || [],
        }
      : undefined,
  };
}

/**
 * Собирает все примеры из всех senses
 */
export function flattenExamples(senses: Sense[]): ExampleItem[] {
  const examples: ExampleItem[] = [];

  senses.forEach((sense) => {
    if (sense.examples) {
      examples.push(...sense.examples);
    }
  });

  return examples;
}

/**
 * Извлекает значение поля из примера (для обратной совместимости)
 */
export function getExampleField(
  example: ExampleItem | Record<string, unknown>,
  field: 'text' | 'translation' | 'th' | 'ru' | 'en'
): string {
  if (!example || typeof example !== 'object') return '';

  // Новая структура
  if ('sentence' in example && typeof example.sentence === 'object') {
    const sentence = example.sentence as Record<string, string>;
    if (field === 'text' || field === 'th') {
      return sentence.th || '';
    }
    if (field === 'translation' || field === 'ru') {
      return sentence.ru || sentence.en || '';
    }
    if (field === 'en') {
      return sentence.en || '';
    }
  }

  // Старая структура (fallback)
  const record = example as Record<string, unknown>;
  return (record[field] as string) || '';
}

/**
 * Конвертирует новую структуру обратно в старую (для обратной совместимости)
 */
export function convertNewToLegacy(entry: DictionaryEntry): Partial<LegacyDictionaryEntry> {
  return {
    word_th: entry.headword.script,
    translation: getAllTranslations(entry.senses, 'ru'),
    transcription_en: entry.headword.romanization?.paiboon || null,
    synonyms: null,
    antonyms: null,
    examples: flattenExamples(entry.senses).map((ex) => ({
      text: ex.sentence.th,
      translation: ex.sentence.ru || ex.sentence.en,
      english: ex.sentence.en,
    })),
    links: entry.metadata?.sources || null,
    created_at: entry.metadata?.createdAt || null,
  };
}
