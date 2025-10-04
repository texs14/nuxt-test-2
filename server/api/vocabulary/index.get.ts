import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server';
import type { Database } from '~~/types/supabase';

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  const client = await serverSupabaseClient<Database>(event);

  // Get user profile with vocabulary
  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('vocabulary')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    throw createError({ statusCode: 500, message: profileError?.message || 'Profile not found' });
  }

  // If vocabulary is empty, return empty array
  if (!profile.vocabulary || profile.vocabulary.length === 0) {
    return [];
  }

  // Get dictionary entries for vocabulary IDs
  const { data: words, error: wordsError } = await client
    .from('dictionary')
    .select('*')
    .in('id', profile.vocabulary);

  if (wordsError) {
    throw createError({ statusCode: 500, message: wordsError.message });
  }

  return words || [];
});
