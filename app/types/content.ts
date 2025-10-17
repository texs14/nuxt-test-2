export type Json = Record<string, any> | null;

export type LocalizedString = Record<string, string> | string | null | undefined;

export interface BaseContentItem {
  id: string | number;
  title: Json | string;
  description?: Json | string | null;
  level?: string | null;
  preview_url?: string | null;
  duration?: Json | null;
}

export interface VideoItem extends BaseContentItem {
  id: string | number;
  duration?: Json | null;
  status?: 'moderation' | 'approved' | 'rejected';
}

export interface LessonItem extends BaseContentItem {
  id: string;
  duration?: Json | null;
  created_at: string;
}

export interface DurationData {
  text?: string;
  seconds?: number;
}
