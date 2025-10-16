import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server';
import type { Database } from '~~/types/supabase';

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  const entryId = getRouterParam(event, 'id');
  if (!entryId) {
    throw createError({ statusCode: 400, message: 'entry_id is required' });
  }

  const client = await serverSupabaseClient<Database>(event);

  // Get current vocabulary
  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('vocabulary')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    throw createError({ statusCode: 500, message: profileError?.message || 'Profile not found' });
  }

  const currentVocabulary = (profile.vocabulary as unknown as string[]) || [];

  // Remove from vocabulary
  const updatedVocabulary = currentVocabulary.filter((id) => id !== entryId);

  const { error: updateError } = await client
    .from('profiles')
    .update({ vocabulary: updatedVocabulary as unknown as number[] })
    .eq('id', user.id);

  if (updateError) {
    throw createError({ statusCode: 500, message: updateError.message });
  }

  return { success: true };
});
