import { createClient } from '@supabase/supabase-js';
import { defineEventHandler, getRouterParam, setHeaders, setResponseStatus } from 'h3';
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

    // Получить роль пользователя
    const user = event.context.user;
    if (!user?.id) {
      setResponseStatus(event, 401);
      return { error: 'Требуется авторизация' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = profile?.role || 'user';

    // Проверка прав: только админы могут одобрять
    if (userRole !== 'admin') {
      setResponseStatus(event, 403);
      return { error: 'Одобрение видео доступно только администраторам' };
    }

    // Обновить статус видео на approved
    const { data, error } = await supabase
      .from('video_items')
      .update({ status: 'approved' })
      .eq('id', String(id))
      .select('id, status, title')
      .maybeSingle();

    if (error) {
      console.error('Approve video error:', error);
      throw error;
    }

    if (!data) {
      setResponseStatus(event, 404);
      return { error: 'Видео не найдено' };
    }

    setHeaders(event, { 'content-type': 'application/json; charset=utf-8' });
    setResponseStatus(event, 200);
    return { ok: true, id: data?.id, status: data?.status };
  } catch (err: any) {
    setResponseStatus(event, 500);
    setHeaders(event, { 'content-type': 'application/json; charset=utf-8' });
    return { error: err?.message || 'Ошибка одобрения видео' };
  }
});
