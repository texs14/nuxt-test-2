import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server';
import type { Database } from '~~/types/supabase';

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user) {
    return { inVocabulary: false };
  }

  const query = getQuery(event);
  const entryId = query.entry_id;

  if (!entryId) {
    throw createError({ statusCode: 400, message: 'entry_id is required' });
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

  const vocabulary = profile.vocabulary as unknown as string[];
  return { inVocabulary: vocabulary.includes(entryId as string) };
});
