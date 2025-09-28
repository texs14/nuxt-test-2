import type { Database } from '~~/types/supabase';
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server';
import { sanitizeProfilePayload, validateProfilePatch } from '~~/utils/validation';
import { normalizeAuthError } from '~~/utils/errors';

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Не авторизовано' });
  }

  const body = await readBody<Record<string, any>>(event);
  // Нельзя обновлять email из профиля — только синхронизация из auth.users
  if ('email' in body) delete body.email;

  const payload = sanitizeProfilePayload(body);
  const { ok, errors } = validateProfilePatch(payload);
  if (!ok) {
    throw createError({ statusCode: 400, statusMessage: errors.join('; ') });
  }

  const client = await serverSupabaseClient<Database>(event);
  const { data, error } = await client
    .from('profiles')
    .update(payload)
    .eq('id', user.id)
    .select('*')
    .single();

  if (error) {
    const e = normalizeAuthError(error);
    throw createError({ statusCode: 400, statusMessage: e.message });
  }

  return data;
});
