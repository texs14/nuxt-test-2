import { defineEventHandler, readBody, setHeaders, setResponseStatus, getRouterParam } from 'h3';
import { createClient } from '@supabase/supabase-js';
import { useRuntimeConfig } from '#imports';

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();
    const supabaseUrl = config.public?.supabase?.url;
    const supabaseKey = (config as any).supabaseServiceKey || config.public?.supabase?.key;
    if (!supabaseUrl || !supabaseKey) throw new Error('Supabase конфигурация отсутствует');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const id = getRouterParam(event, 'id');
    if (!id) {
      setResponseStatus(event, 400);
      return { error: 'ID не указан' };
    }

    const body = await readBody<any>(event);
    const allowedLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    if (body.level && !allowedLevels.includes(body.level)) {
      setResponseStatus(event, 400);
      return { error: `Недопустимое значение level. Разрешены: ${allowedLevels.join(', ')}` };
    }

    const payload: any = { updated_at: new Date().toISOString() };
    if (body.title) payload.title = body.title;
    if (body.description) payload.description = body.description;
    if (body.level) payload.level = body.level;
    if (body.subtitles) payload.subtitles = body.subtitles;
    if (body.exercises !== undefined) payload.exercises = body.exercises;

    const { data, error } = await supabase
      .from('lesson_items')
      .update(payload)
      .eq('id', id)
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
