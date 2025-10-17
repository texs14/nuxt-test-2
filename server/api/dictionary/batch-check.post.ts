import { createClient } from '@supabase/supabase-js';
import { serverSupabaseUser } from '#supabase/server';

/**
 * Server API endpoint для проверки слов в словаре
 * POST /api/dictionary/batch-check
 * Проверяет массив слов на наличие в словаре и возвращает список отсутствующих
 */

interface BatchCheckRequestBody {
  words: string[];
}

interface BatchCheckResponse {
  total: number;
  existing: string[];
  missing: string[];
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const supabaseServiceKey = config.supabaseServiceKey;

  if (!supabaseServiceKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Supabase Service Key не настроен',
    });
  }

  // Проверка аутентификации
  const user = await serverSupabaseUser(event);
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Требуется авторизация',
    });
  }

  // Создаем Supabase клиент
  const supabase = createClient(config.public.supabase.url, supabaseServiceKey);

  // Проверка прав модератора
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'moderator' && profile.role !== 'admin')) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Недостаточно прав. Требуется роль модератора.',
    });
  }

  // Чтение тела запроса
  const body = await readBody<BatchCheckRequestBody>(event);

  // Валидация
  if (!body.words || !Array.isArray(body.words)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Отсутствует параметр words или неверный формат',
    });
  }

  // Нормализация и удаление дубликатов
  const uniqueWords = Array.from(
    new Set(body.words.map((word) => word.trim()).filter((word) => word.length > 0))
  );

  if (uniqueWords.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Список слов пуст',
    });
  }

  try {
    // Проверяем все слова одним запросом
    const { data: existingEntries, error } = await supabase
      .from('new_dictionar')
      .select('headword')
      .in(
        'headword->>script',
        uniqueWords
      );

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: `Ошибка проверки слов: ${error.message}`,
      });
    }

    // Формируем список существующих слов
    const existingWords = existingEntries?.map((entry: any) => entry.headword.script) || [];
    
    // Находим отсутствующие слова
    const missingWords = uniqueWords.filter((word) => !existingWords.includes(word));

    const response: BatchCheckResponse = {
      total: uniqueWords.length,
      existing: existingWords,
      missing: missingWords,
    };

    return response;
  } catch (error: any) {
    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка проверки слов',
    });
  }
});
