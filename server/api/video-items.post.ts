import { defineEventHandler, readBody, setHeaders, setResponseStatus } from 'h3';
import { createClient } from '@supabase/supabase-js';
import { useRuntimeConfig } from '#imports';

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();
    const supabaseUrl = config.public?.supabase?.url;
    const supabaseKey = (config as any).supabaseServiceKey || config.public?.supabase?.key;
    if (!supabaseUrl || !supabaseKey) throw new Error('Supabase конфигурация отсутствует');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await readBody<any>(event);
    const allowedLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

    // Минимальные требования: только video_url обязателен
    if (!body || !body.video_url) {
      setResponseStatus(event, 400);
      return {
        error: 'Некорректное тело запроса: требуется поле video_url',
      };
    }

    // Проверка level если передан
    if (body.level && !allowedLevels.includes(body.level)) {
      setResponseStatus(event, 400);
      return { error: `Недопустимое значение level. Разрешены: ${allowedLevels.join(', ')}` };
    }

    const title = body.title
      ? typeof body.title === 'object'
        ? body.title
        : { ru: String(body.title) }
      : { ru: 'Видео без названия', th: '', en: '' };

    const description = body.description
      ? typeof body.description === 'object'
        ? body.description
        : { ru: String(body.description) }
      : { ru: '', th: '', en: '' };

    const seconds = Number(body.duration?.seconds ?? 0);
    const hhmmss = (total: number) => {
      const s = Math.max(0, Math.floor(total));
      const hh = Math.floor(s / 3600)
        .toString()
        .padStart(2, '0');
      const mm = Math.floor((s % 3600) / 60)
        .toString()
        .padStart(2, '0');
      const ss = (s % 60).toString().padStart(2, '0');
      return `${hh}:${mm}:${ss}`;
    };
    const duration = seconds > 0 ? { seconds, text: hhmmss(seconds) } : null;

    // Генерация ID если не передан
    const generateId = () => {
      try {
        return crypto.randomUUID();
      } catch {
        return 'vid_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      }
    };

    const payload = {
      id: body.id ? String(body.id) : generateId(),
      preview_url: body.preview_url ? String(body.preview_url) : null,
      video_url: String(body.video_url),
      title,
      description,
      level: body.level ? String(body.level) : 'A1',
      duration,
      subtitles: body.subtitles || [],
      status: body.status || 'moderation',
      comments_json_legacy: [] as any[],
    };

    const { data, error } = await supabase
      .from('video_items')
      .insert(payload)
      .select('id')
      .single();

    if (error) throw error;

    setHeaders(event, { 'content-type': 'application/json; charset=utf-8' });
    setResponseStatus(event, 200);
    return { ok: true, id: data?.id };
  } catch (err: any) {
    setResponseStatus(event, 500);
    setHeaders(event, { 'content-type': 'application/json; charset=utf-8' });
    return { error: err?.message || 'Save error' };
  }
});
