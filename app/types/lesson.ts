export interface ThaiSentences {
  sentences: string[][];
}

export interface SubtitleText {
  th?: string | ThaiSentences;
  en?: string;
  ru?: string;
}

export interface LocaleText {
  th?: string;
  en?: string;
  ru?: string;
}

export interface SubtitleItem {
  id?: number | string;
  start: number;
  end: number;
  text?: SubtitleText | string;
}

export interface ExerciseItem {
  th: string;
  ru: string;
  en: string;
}
