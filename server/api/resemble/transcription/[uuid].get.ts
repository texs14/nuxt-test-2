import type { ResembleTranscriptionResponse } from '~~/types/resemble';

/**
 * Server API endpoint для получения статуса транскрибации Resemble AI
 * GET /api/resemble/transcription/[uuid]
 *
 * Проверяет статус задачи транскрибации и возвращает результат при готовности
 */
export default defineEventHandler(async (event): Promise<ResembleTranscriptionResponse> => {
  const config = useRuntimeConfig();
  const resembleKey = config.resembleKey;

  // Проверка наличия API ключа
  if (!resembleKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Resemble Transcription API key не настроен',
    });
  }

  // Получение UUID из параметров маршрута
  const uuid = event.context.params?.uuid as string;

  if (!uuid) {
    throw createError({
      statusCode: 400,
      statusMessage: 'UUID транскрибации не указан',
    });
  }

  try {
    // Отправка запроса к Resemble AI API для получения статуса
    const response: ResembleTranscriptionResponse = await $fetch<ResembleTranscriptionResponse>(
      `https://f.cluster.resemble.ai/transcribe/${encodeURIComponent(uuid)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${resembleKey}`,
        },
      }
    );

    // Возврат полного ответа клиенту
    return response;
  } catch (error: any) {
    // Обработка ошибок запроса
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Ошибка при получении статуса транскрибации',
      data: { originalError: error?.data || error?.message },
    });
  }
});
