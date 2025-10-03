import type { SubtitleSource, ThaiSentences, Locale } from '~/types/video.types';

/**
 * Утилиты для работы с текстом субтитров
 */

const isThaiSentences = (value: any): value is ThaiSentences =>
  value && typeof value === 'object' && Array.isArray(value.sentences);

/**
 * Извлекает тайский текст из субтитра
 */
export const getThaiText = (s: SubtitleSource): string => {
  if (typeof s.text === 'string') return s.text;
  const th = s.text?.th;
  if (!th) return '';
  if (isThaiSentences(th)) {
    return th.sentences
      .map((sentence) => sentence.filter(Boolean).join(' '))
      .filter(Boolean)
      .join(' ');
  }
  return th;
};

/**
 * Извлекает тайские предложения в формате массива слов
 */
export const getThaiSentences = (s: SubtitleSource): string[][] => {
  if (typeof s.text === 'string') return [[s.text]];
  const th = s.text?.th;
  if (!th) return [];
  if (isThaiSentences(th)) return th.sentences ?? [];
  return [String(th).trim()].filter(Boolean).map((value) => value.split(/\s+/u).filter(Boolean));
};

/**
 * Извлекает текст для указанной локали
 */
export const getTextForLocale = (s: SubtitleSource, code: Locale): string => {
  if (code === 'th') return getThaiText(s);
  if (typeof s.text === 'string') return s.text;
  const value = s.text?.[code];
  return typeof value === 'string' ? value : '';
};

/**
 * Извлекает текст перевода (не тайский)
 */
export const getSelectedText = (s: SubtitleSource, locale: Locale): string => {
  if (locale === 'th') return '';
  return getTextForLocale(s, locale);
};

/**
 * Composable для работы с текстом субтитров
 */
export const useSubtitleText = () => {
  return {
    getThaiText,
    getThaiSentences,
    getTextForLocale,
    getSelectedText,
    isThaiSentences,
  };
};
