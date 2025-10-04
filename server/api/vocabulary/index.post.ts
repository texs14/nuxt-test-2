import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server';
import type { Database } from '~~/types/supabase';

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  const body = await readBody<{ dictionary_id: number }>(event);

  if (!body.dictionary_id) {
    throw createError({ statusCode: 400, message: 'dictionary_id is required' });
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

  const currentVocabulary = profile.vocabulary || [];

  // Check if already exists
  if (currentVocabulary.includes(body.dictionary_id)) {
    return { success: true, message: 'Already in vocabulary' };
  }

  // Add to vocabulary
  const updatedVocabulary = [...currentVocabulary, body.dictionary_id];

  const { error: updateError } = await client
    .from('profiles')
    .update({ vocabulary: updatedVocabulary })
    .eq('id', user.id);

  if (updateError) {
    throw createError({ statusCode: 500, message: updateError.message });
  }

  return { success: true };
});
