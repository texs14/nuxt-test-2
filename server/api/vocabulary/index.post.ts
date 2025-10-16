import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server';
import type { Database } from '~~/types/supabase';

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  const body = await readBody<{ entry_id: string }>(event);

  if (!body.entry_id) {
    throw createError({ statusCode: 400, message: 'entry_id is required' });
  }

  const client = await serverSupabaseClient<Database>(event);

  // Verify entry exists in new_dictionar
  const { data: dictionaryEntry, error: dictionaryError } = await client
    .from('new_dictionar')
    .select('entry_id')
    .eq('entry_id', body.entry_id)
    .single();

  if (dictionaryError || !dictionaryEntry) {
    throw createError({ statusCode: 404, message: 'Dictionary entry not found' });
  }

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

  // Check if already exists
  if (currentVocabulary.includes(body.entry_id)) {
    return { success: true, message: 'Already in vocabulary' };
  }

  // Add to vocabulary
  const updatedVocabulary = [...currentVocabulary, body.entry_id];

  const { error: updateError } = await client
    .from('profiles')
    .update({ vocabulary: updatedVocabulary as unknown as number[] })
    .eq('id', user.id);

  if (updateError) {
    throw createError({ statusCode: 500, message: updateError.message });
  }

  return { success: true };
});
