import { serverSupabaseServiceRole } from '#supabase/server';
import { validateUsername } from '~~/utils/validation';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const u = (query.u || query.username || '').toString().trim();

  if (!u) {
    throw createError({ statusCode: 400, statusMessage: 'Не указан username' });
  }
  if (!validateUsername(u)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Неверный формат username (^[a-z0-9._-]{3,30}$)',
    });
  }

  const admin = await serverSupabaseServiceRole(event);
  const { count, error } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('username', u);

  if (error) {
    throw createError({ statusCode: 400, statusMessage: error.message });
  }

  return { available: (count || 0) === 0 };
});
