import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server';
import type { Database } from '~~/types/supabase';

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user) {
    return { inVocabulary: false };
  }

  const query = getQuery(event);
  const dictionaryId = query.dictionary_id;

  if (!dictionaryId) {
    throw createError({ statusCode: 400, message: 'dictionary_id is required' });
  }

  const client = await serverSupabaseClient<Database>(event);

  const { data: profile } = await client
    .from('profiles')
    .select('vocabulary')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.vocabulary) {
    return { inVocabulary: false };
  }

  const wordId = parseInt(dictionaryId as string);
  return { inVocabulary: profile.vocabulary.includes(wordId) };
});
