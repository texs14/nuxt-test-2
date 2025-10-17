import { ref, computed } from 'vue';
import { useSupabaseClient } from '#imports';
import { useI18n } from 'vue-i18n';
import type { LocaleText, EditorSubtitleItem } from '../subtitles/useSubtitleNormalization';
import {
  normalizeLocaleText,
  normalizeEditorSubtitles,
  buildSubtitlesPayload,
} from '../subtitles/useSubtitleNormalization';

export type MediaType = 'video' | 'lesson';

export interface MediaItemData {
  id?: string;
  title?: LocaleText;
  description?: LocaleText;
  level?: string;
  video_url?: string;
  preview_url?: string;
  duration?: { seconds: number };
  subtitles?: any[];
  exercises?: any[];
  status?: 'moderation' | 'approved' | 'rejected';
}

export function useMediaItem(type: MediaType = 'video') {
  const { t } = useI18n();
  const supabase = useSupabaseClient();

  const tableName = type === 'video' ? 'video_items' : 'lesson_items';
  const apiEndpoint = type === 'video' ? '/api/video-items' : '/api/lesson-items';

  const title = ref<LocaleText>({ th: '', ru: '', en: '' });
  const description = ref<LocaleText>({ th: '', ru: '', en: '' });
  const level = ref<string>('A1');
  const durationSeconds = ref<number>(0);
  const newId = ref<string>('');
  const status = ref<'moderation' | 'approved' | 'rejected'>('moderation');

  const saving = ref(false);
  const saveOk = ref(false);
  const saveError = ref('');
  const saveId = ref<string | number>('');

  const loadingExisting = ref(false);
  const loadError = ref('');

  const uploadedVideoUrl = ref<string>('');
  const uploadedPreviewUrl = ref<string>('');
  const editorSubtitles = ref<EditorSubtitleItem[]>([]);

  function genId(): string {
    try {
      return crypto.randomUUID();
    } catch {
      const prefix = type === 'video' ? 'vid_' : 'lesson_';
      return prefix + Math.random().toString(36).slice(2) + Date.now().toString(36);
    }
  }

  async function loadExisting(editId: string) {
    if (loadingExisting.value) return;

    loadingExisting.value = true;
    loadError.value = '';

    try {
      const fields =
        type === 'video'
          ? 'id, title, description, level, video_url, preview_url, duration, subtitles, status'
          : 'id, title, description, level, video_url, preview_url, duration, subtitles, exercises';

      const res = await supabase.from(tableName).select(fields).eq('id', editId).maybeSingle();

      if (res.error) throw res.error;

      const data = res.data as any;
      if (data) {
        newId.value = String(data.id);
        uploadedVideoUrl.value = String(data.video_url || '');
        uploadedPreviewUrl.value = String(data.preview_url || '');

        if (type === 'video' && data.status) {
          status.value = data.status;
        }

        const d = data.duration as any;
        durationSeconds.value = Number(d?.seconds ?? 0);

        editorSubtitles.value = normalizeEditorSubtitles((data.subtitles as any[]) || []);

        title.value = normalizeLocaleText(data.title);
        description.value = normalizeLocaleText(data.description);
        level.value = String(data.level || 'A1');

        return data;
      }
    } catch (e: any) {
      loadError.value = e?.message || t('videos.addNew.loadError');
      throw e;
    } finally {
      loadingExisting.value = false;
    }
  }

  async function createItem(additionalData: Partial<MediaItemData> = {}) {
    if (!uploadedVideoUrl.value) {
      throw new Error(t('videos.addNew.missingVideoUrl'));
    }

    if (newId.value) {
      console.warn('createItem: ID already exists, skipping');
      return;
    }

    const id = genId();

    const payload: MediaItemData = {
      id,
      video_url: uploadedVideoUrl.value,
      preview_url: uploadedPreviewUrl.value || undefined,
      title: title.value,
      description: description.value,
      level: level.value || 'A1',
      duration: durationSeconds.value > 0 ? { seconds: durationSeconds.value } : undefined,
      subtitles: buildSubtitlesPayload(editorSubtitles.value),
      ...additionalData,
    };

    if (type === 'video') {
      payload.status = 'moderation';
    }

    const res = await fetch(apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json?.error || t('videos.addNew.saveFailed'));
    }

    newId.value = id;
    if (type === 'video') {
      status.value = 'moderation';
    }
    saveOk.value = true;

    return json;
  }

  async function updateItem(additionalData: Partial<MediaItemData> = {}) {
    if (!newId.value) {
      throw new Error(t('videos.addNew.missingId'));
    }

    const payload: Partial<MediaItemData> = {
      subtitles: buildSubtitlesPayload(editorSubtitles.value),
      title: title.value,
      description: description.value,
      level: level.value,
      duration: durationSeconds.value > 0 ? { seconds: durationSeconds.value } : undefined,
      ...additionalData,
    };

    const res = await fetch(`${apiEndpoint}/${encodeURIComponent(String(newId.value))}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json?.error || t('videos.addNew.updateFailed'));
    }

    saveOk.value = true;
    saveId.value = json?.id || newId.value;

    return json;
  }

  async function saveItem(isEditMode: boolean, additionalData: Partial<MediaItemData> = {}) {
    saveError.value = '';
    saveOk.value = false;
    saving.value = true;

    try {
      if (isEditMode || newId.value) {
        return await updateItem(additionalData);
      } else {
        return await createItem(additionalData);
      }
    } catch (e: any) {
      saveError.value = e?.message || t('videos.addNew.saveError');
      throw e;
    } finally {
      saving.value = false;
    }
  }

  function onUpdateTitle(v: LocaleText) {
    title.value = v;
  }

  function onUpdateDescription(v: LocaleText) {
    description.value = v;
  }

  function onUpdateLevel(v: string) {
    level.value = v;
  }

  function setDuration(seconds: number) {
    durationSeconds.value = seconds;
  }

  function setUploadedUrls(videoUrl: string, previewUrl?: string) {
    uploadedVideoUrl.value = videoUrl;
    if (previewUrl) {
      uploadedPreviewUrl.value = previewUrl;
    }
  }

  return {
    // State
    title,
    description,
    level,
    durationSeconds,
    newId,
    status,
    saving,
    saveOk,
    saveError,
    saveId,
    loadingExisting,
    loadError,
    uploadedVideoUrl,
    uploadedPreviewUrl,
    editorSubtitles,

    // Computed
    canSave: computed(() => !!uploadedVideoUrl.value),

    // Methods
    genId,
    loadExisting,
    createItem,
    updateItem,
    saveItem,
    onUpdateTitle,
    onUpdateDescription,
    onUpdateLevel,
    setDuration,
    setUploadedUrls,
  };
}
