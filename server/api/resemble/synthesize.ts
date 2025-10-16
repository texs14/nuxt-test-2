import type { ResembleSynthesizeRequest, ResembleSynthesizeResponse } from '~~/types/resemble';

/**
 * Server API endpoint для синтеза речи через Resemble AI
 * POST /api/resemble/synthesize
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const resembleKey = config.resembleKey;

  // Проверка наличия API ключа
  if (!resembleKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Resemble API key не настроен',
    });
  }

  // Чтение тела запроса
  const body = await readBody<ResembleSynthesizeRequest>(event);

  // Валидация обязательных полей
  if (!body.voice_uuid || !body.data) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Отсутствуют обязательные параметры: voice_uuid и data',
    });
  }

  // Подготовка данных для отправки в Resemble AI
  const requestData: ResembleSynthesizeRequest = {
    voice_uuid: body.voice_uuid,
    data: body.data,
    sample_rate: body.sample_rate || 44100,
    output_format: body.output_format || 'wav',
    precision: body.precision || 'PCM_32',
  };

  // Добавление опциональных полей
  if (body.project_uuid) {
    requestData.project_uuid = body.project_uuid;
  }
  if (body.title) {
    requestData.title = body.title;
  }

  try {
    // Отправка запроса к Resemble AI API
    const response = await $fetch<ResembleSynthesizeResponse>(
      'https://f.cluster.resemble.ai/synthesize',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resembleKey}`,
          'Content-Type': 'application/json',
          'Accept-Encoding': 'gzip, deflate, br',
        },
        body: requestData,
      }
    );

    // Проверка успешности запроса
    if (!response.success) {
      throw createError({
        statusCode: 500,
        statusMessage: `Ошибка синтеза речи: ${response.issues.join(', ')}`,
      });
    }

    // Возврат ответа клиенту
    return response;
  } catch (error: any) {
    // Обработка ошибок запроса
    console.error('Resemble AI API Error:', error);

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Ошибка при обращении к Resemble AI API',
    });
  }
});
