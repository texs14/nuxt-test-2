import { createClient } from '@supabase/supabase-js';
import { defineEventHandler, getRouterParam, readBody, setHeaders, setResponseStatus } from 'h3';
import { useRuntimeConfig } from '#imports';

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id');
    if (!id) {
      setResponseStatus(event, 400);
      return { error: 'ID обязателен' };
    }

    const config = useRuntimeConfig();
    const supabaseUrl = config.public?.supabase?.url;
    const supabaseKey = (config as any).supabaseServiceKey || config.public?.supabase?.key;
    if (!supabaseUrl || !supabaseKey) throw new Error('Supabase конфигурация отсутствует');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await readBody<any>(event);
    if (!body || typeof body !== 'object') {
      setResponseStatus(event, 400);
      return { error: 'Некорректное тело запроса' };
    }

    // Разрешённые к обновлению поля
    const allowed: Record<string, any> = {};
    if ('subtitles' in body) allowed.subtitles = body.subtitles;
    if ('title' in body) allowed.title = body.title;
    if ('description' in body) allowed.description = body.description;
    if ('level' in body) allowed.level = body.level;
    if ('preview_url' in body) allowed.preview_url = body.preview_url;
    if ('video_url' in body) allowed.video_url = body.video_url;
    if ('duration' in body) allowed.duration = body.duration;

    if (Object.keys(allowed).length === 0) {
      setResponseStatus(event, 400);
      return { error: 'Нет полей для обновления' };
    }

    const { data, error } = await supabase
      .from('video_items')
      .update(allowed)
      .eq('id', String(id))
      .select('id')
      .single();

    if (error) throw error;

    setHeaders(event, { 'content-type': 'application/json; charset=utf-8' });
    setResponseStatus(event, 200);
    return { ok: true, id: data?.id };
  } catch (err: any) {
    setResponseStatus(event, 500);
    setHeaders(event, { 'content-type': 'application/json; charset=utf-8' });
    return { error: err?.message || 'Update error' };
  }
});
