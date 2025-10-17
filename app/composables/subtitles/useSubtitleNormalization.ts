import type { Ref } from 'vue';
import { computed } from 'vue';
import type { SubtitleItem, NormalizedSubtitle, SubtitleText } from '~/types/video.types';
import {
  type ThaiSentences,
  prepareThaiEditorValue,
  buildThaiSentencesPayload,
  flattenThaiSentences,
} from '../shared/useThaiTextProcessing';

export interface LocaleText {
  th?: string;
  ru?: string;
  en?: string;
}

export interface EditorSubtitleText {
  th?: string;
  en?: string;
  ru?: string;
}

export interface EditorSubtitleItem {
  id?: number | string;
  start: number;
  end: number;
  text?: EditorSubtitleText | string;
}

/**
 * Нормализует одно поле локали (может быть строка или ThaiSentences)
 */
export function normalizeLocaleField(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'sentences' in value) {
    return flattenThaiSentences(value as ThaiSentences);
  }
  return String(value ?? '');
}

/**
 * Нормализует объект с мультиязычным текстом
 */
export function normalizeLocaleText(value: unknown): LocaleText {
  if (!value) return { th: '', ru: '', en: '' };

  if (typeof value === 'string') {
    return { th: '', ru: String(value), en: '' };
  }

  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<'th' | 'ru' | 'en', unknown>;
    return {
      th: obj.th ? normalizeLocaleField(obj.th) : '',
      ru: obj.ru ? normalizeLocaleField(obj.ru) : '',
      en: obj.en ? normalizeLocaleField(obj.en) : '',
    };
  }

  return { th: '', ru: String(value ?? ''), en: '' };
}

/**
 * Преобразует сырые субтитры в формат для редактора
 * Тайский текст преобразуется в плоскую строку с пробелами
 */
export function normalizeEditorSubtitles(items: SubtitleItem[]): EditorSubtitleItem[] {
  return items.map((item, index) => {
    const baseText =
      typeof item.text === 'string'
        ? ({ ru: item.text } as SubtitleText)
        : ({ ...(item.text ?? {}) } as SubtitleText);

    const thaiSource = (() => {
      const th = baseText.th;
      if (!th) return undefined;
      if (typeof th === 'string') return th;
      if (typeof th === 'object') return th as ThaiSentences;
      return undefined;
    })();

    return {
      id: item.id ?? index + 1,
      start: Number(item.start ?? 0),
      end: Number(item.end ?? 0),
      text: {
        th: prepareThaiEditorValue(thaiSource),
        ru: baseText.ru ? normalizeLocaleField(baseText.ru) : '',
        en: baseText.en ? normalizeLocaleField(baseText.en) : '',
      },
    };
  });
}

/**
 * Преобразует субтитры из редактора в формат для сохранения
 * Тайский текст преобразуется в структуру ThaiSentences
 */
export function buildSubtitlesPayload(items: EditorSubtitleItem[]): SubtitleItem[] {
  return items.map((item, index) => {
    const text: EditorSubtitleText =
      typeof item.text === 'string' ? { ru: item.text } : { ...(item.text ?? {}) };

    const thaiSource = (() => {
      const th = text.th;
      if (!th) return undefined;
      if (typeof th === 'string') return th;
      if (typeof th === 'object') return th as ThaiSentences;
      return undefined;
    })();

    return {
      id: item.id ?? index + 1,
      start: Number(item.start ?? 0),
      end: Number(item.end ?? 0),
      text: {
        ...text,
        th: buildThaiSentencesPayload(thaiSource),
      } as SubtitleText,
    };
  });
}

/**
 * Базовая нормализация для простого использования (реактивная)
 */
export const useSubtitleNormalization = (subtitles: Ref<SubtitleItem[] | null | undefined>) => {
  const normalizedSubtitles = computed<NormalizedSubtitle[]>(() => {
    const list = (subtitles.value ?? [])
      .filter((item: any): item is SubtitleItem => Boolean(item))
      .map((subtitle: any) => {
        const text: SubtitleText =
          typeof subtitle.text === 'string' ? { ru: subtitle.text } : (subtitle.text ?? {});

        return {
          id: subtitle.id ?? Math.random().toString(36).slice(2),
          start: Number(subtitle.start) || 0,
          end: Number(subtitle.end) || 0,
          text,
        } satisfies NormalizedSubtitle;
      })
      .sort((a: any, b: any) => a.start - b.start);

    return list;
  });

  return {
    normalizedSubtitles,
  };
};
