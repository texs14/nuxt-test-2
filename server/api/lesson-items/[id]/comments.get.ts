import { defineEventHandler, setHeaders, setResponseStatus, getRouterParam } from 'h3';
import { createClient } from '@supabase/supabase-js';
import { useRuntimeConfig } from '#imports';

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();
    const supabaseUrl = config.public?.supabase?.url;
    const supabaseKey = (config as any).supabaseServiceKey || config.public?.supabase?.key;
    if (!supabaseUrl || !supabaseKey) throw new Error('Supabase конфигурация отсутствует');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const lessonId = getRouterParam(event, 'id');
    if (!lessonId) {
      setResponseStatus(event, 400);
      return { error: 'ID урока не указан' };
    }

    const { data, error } = await supabase
      .from('lesson_comments')
      .select('*, profiles:user_id(username, avatar_url)')
      .eq('lesson_id', lessonId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    setHeaders(event, { 'content-type': 'application/json; charset=utf-8' });
    return { comments: data || [] };
  } catch (err: any) {
    setResponseStatus(event, 500);
    setHeaders(event, { 'content-type': 'application/json; charset=utf-8' });
    return { error: err?.message || 'Ошибка загрузки комментариев' };
  }
});
