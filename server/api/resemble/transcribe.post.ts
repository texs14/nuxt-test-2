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
  // API ожидает поле 'url', а не 'audio_url'
  // Resemble AI поддерживает как аудио, так и видео файлы
  const requestData: Record<string, any> = {
    url: body.audio_url,
  };

  console.log('[Resemble] Transcription request:', {
    url: body.audio_url,
    hasProjectUuid: !!body.project_uuid,
  });

  // Добавление опциональных полей
  if (body.project_uuid) {
    requestData.project_uuid = body.project_uuid;
  }

  try {
    // Отправка запроса к Resemble AI Speech-to-Text API
    const response = await $fetch<any>('https://app.resemble.ai/api/v2/speech-to-text', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resembleKey}`,
        'Content-Type': 'application/json',
      },
      body: requestData,
    });

    // Логирование для отладки
    console.log('Resemble API response:', JSON.stringify(response, null, 2));

    // Проверка структуры ответа - может быть вложен в item
    const transcriptionData = response.item || response;

    if (!transcriptionData.uuid) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Resemble.AI did not return a transcription UUID',
        data: { response },
      });
    }

    // Возврат ответа клиенту
    return {
      uuid: transcriptionData.uuid,
      status: transcriptionData.status || 'processing',
      created_at: transcriptionData.created_at,
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
