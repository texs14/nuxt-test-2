import type {
  ResembleTranscriptionRequest,
  ResembleTranscriptionResponse,
} from '~~/types/resemble';

/**
 * Server API endpoint для запуска транскрибации через Resemble AI
 * POST /api/resemble/transcribe
 *
 * Отправляет аудио на транскрибацию и возвращает UUID задачи
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const resembleKey = config.resembleKey;

  // Проверка наличия API ключа
  if (!resembleKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Resemble Transcription API key не настроен',
    });
  }

  // Чтение тела запроса
  const body = await readBody<ResembleTranscriptionRequest>(event);

  // Валидация обязательных полей
  if (!body.audio_url) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Отсутствует обязательный параметр: audio_url',
    });
  }

  // Подготовка данных для отправки в Resemble AI
  const requestData: Record<string, any> = {
    audio_url: body.audio_url,
  };

  // Добавление опциональных полей
  if (body.project_uuid) {
    requestData.project_uuid = body.project_uuid;
  }

  try {
    // Отправка запроса к Resemble AI Transcription API
    const response = await $fetch<ResembleTranscriptionResponse>(
      'https://f.cluster.resemble.ai/transcribe',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resembleKey}`,
          'Content-Type': 'application/json',
        },
        body: requestData,
      }
    );

    // Возврат ответа клиенту
    return {
      uuid: response.uuid,
      status: response.status,
      created_at: response.created_at,
    };
  } catch (error: any) {
    // Обработка ошибок запроса
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Ошибка при обращении к Resemble AI Transcription API',
      data: { originalError: error?.data || error?.message },
    });
  }
});
