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

    // Получить роль пользователя для проверки прав на изменение статуса
    const user = event.context.user;
    let userRole = 'user';
    if (user?.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      userRole = profile?.role || 'user';
    }

    // Разрешённые к обновлению поля (created_at и updated_at управляются триггерами)
    const allowed: Record<string, any> = {};
    if ('subtitles' in body) allowed.subtitles = body.subtitles;
    if ('title' in body) allowed.title = body.title;
    if ('description' in body) allowed.description = body.description;
    if ('level' in body) allowed.level = body.level;
    if ('preview_url' in body) allowed.preview_url = body.preview_url;
    if ('video_url' in body) allowed.video_url = body.video_url;
    if ('duration' in body) allowed.duration = body.duration;

    // Изменение статуса доступно только админам
    if ('status' in body) {
      if (userRole === 'admin') {
        allowed.status = body.status;
      } else {
        setResponseStatus(event, 403);
        return { error: 'Изменение статуса доступно только администраторам' };
      }
    }

    if (Object.keys(allowed).length === 0) {
      setResponseStatus(event, 400);
      return { error: 'Нет полей для обновления' };
    }

    // Проверка существования записи
    const { data: existing, error: checkError } = await supabase
      .from('video_items')
      .select('id')
      .eq('id', String(id))
      .maybeSingle();

    if (checkError) {
      console.error('Check video error:', checkError);
      throw checkError;
    }

    if (!existing) {
      setResponseStatus(event, 404);
      return { error: `Видео с ID ${id} не найдено в БД` };
    }

    // Обновление записи
    const { data, error } = await supabase
      .from('video_items')
      .update(allowed)
      .eq('id', String(id))
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('Update video error:', error);
      throw error;
    }

    if (!data) {
      setResponseStatus(event, 404);
      return { error: 'Не удалось обновить видео' };
    }

    setHeaders(event, { 'content-type': 'application/json; charset=utf-8' });
    setResponseStatus(event, 200);
    return { ok: true, id: data?.id };
  } catch (err: any) {
    setResponseStatus(event, 500);
    setHeaders(event, { 'content-type': 'application/json; charset=utf-8' });
    return { error: err?.message || 'Update error' };
  }
});
