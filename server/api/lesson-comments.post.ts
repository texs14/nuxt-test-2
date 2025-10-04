import { defineEventHandler, readBody, setHeaders, setResponseStatus } from 'h3';
import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server';

export default defineEventHandler(async (event) => {
  try {
    const user = await serverSupabaseUser(event);
    if (!user) {
      setResponseStatus(event, 401);
      return { error: 'Необходима авторизация' };
    }

    const supabase = await serverSupabaseClient(event);
    const body = await readBody<any>(event);

    if (!body || !body.lesson_id || !body.content) {
      setResponseStatus(event, 400);
      return { error: 'Требуются поля lesson_id и content' };
    }

    const { data, error } = await supabase
      .from('lesson_comments')
      .insert({
        lesson_id: body.lesson_id,
        user_id: user.id,
        content: body.content,
      } as any)
      .select('*, profiles:user_id(username, avatar_url)')
      .single();

    if (error) throw error;

    setHeaders(event, { 'content-type': 'application/json; charset=utf-8' });
    return { comment: data };
  } catch (err: any) {
    setResponseStatus(event, 500);
    setHeaders(event, { 'content-type': 'application/json; charset=utf-8' });
    return { error: err?.message || 'Ошибка создания комментария' };
  }
});
