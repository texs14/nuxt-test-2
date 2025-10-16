import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server';
import type { Database } from '~~/types/supabase';
import type { DictionaryEntry } from '~~/types/dictionary';

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

  const vocabulary = (profile.vocabulary as unknown as string[]) || [];

  // If vocabulary is empty, return empty array
  if (vocabulary.length === 0) {
    return [];
  }

  // Get dictionary entries for vocabulary entry_ids
  const { data: words, error: wordsError } = await client
    .from('new_dictionar')
    .select('*')
    .in('entry_id', vocabulary);

  if (wordsError) {
    throw createError({ statusCode: 500, message: wordsError.message });
  }

  // Transform to DictionaryEntry format
  const entries: DictionaryEntry[] = (words || []).map((word: any) => ({
    entryId: word.entry_id,
    headword: word.headword,
    metadata: word.metadata,
    senses: word.senses,
    related: word.related,
  }));

  return entries;
});
