/**
 * Типы для работы с видео и субтитрами
 */

export type ThaiSentences = { sentences: string[][] };

export interface SubtitleText {
  th?: string | ThaiSentences;
  en?: string;
  ru?: string;
  [key: string]: string | ThaiSentences | undefined;
}

export interface SubtitleItem {
  id?: number | string;
  start: number;
  end: number;
  text?: SubtitleText | string;
}

export interface NormalizedSubtitle {
  id: number | string;
  start: number;
  end: number;
  text: SubtitleText;
}

export type SubtitleSource = SubtitleItem | NormalizedSubtitle;

export type Token =
  | {
      id: string;
      value: string;
      type: 'word';
    }
  | {
      id: string;
      value: string;
      type: 'separator';
    };

export interface PlaybackRange {
  start: number;
  end: number;
}

export type Locale = 'ru' | 'en' | 'th';
