/**
 * Маппинг локалей i18n на языки словаря
 */
export const LOCALE_TO_DICTIONARY_LANG: Record<string, 'ru' | 'en'> = {
  ru: 'ru',
  'ru-RU': 'ru',
  en: 'en',
  'en-US': 'en',
  'en-GB': 'en',
  th: 'en', // Fallback для тайского на английский
  'th-TH': 'en',
};

/**
 * Получает язык словаря из текущей локали
 */
export function getDictionaryLanguage(locale: string): 'ru' | 'en' {
  return LOCALE_TO_DICTIONARY_LANG[locale] || 'en';
}

/**
 * Получает fallback язык если основной недоступен
 */
export function getFallbackLanguage(primary: 'ru' | 'en'): 'ru' | 'en' {
  return primary === 'ru' ? 'en' : 'ru';
}

/**
 * Определяет есть ли переводы на указанном языке
 */
export function hasTranslationInLanguage(
  translations: Array<{ language: string }>,
  language: 'ru' | 'en'
): boolean {
  return translations.some((t) => t.language === language);
}
