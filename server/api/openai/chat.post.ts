/**
 * Server API endpoint для работы с OpenAI Chat Completions API
 * POST /api/openai/chat
 */

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequestBody {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const openaiKey = config.openaiKey;

  // Проверка наличия API ключа
  if (!openaiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'OpenAI API key не настроен',
    });
  }

  // Чтение тела запроса
  const body = await readBody<ChatRequestBody>(event);

  // Валидация обязательных полей
  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Отсутствует массив сообщений',
    });
  }

  // Подготовка данных для отправки в OpenAI
  const requestData = {
    model: body.model || 'gpt-4',
    messages: body.messages,
    temperature: body.temperature ?? 0.7,
    max_tokens: body.max_tokens || 2000,
    top_p: body.top_p ?? 1,
  };

  try {
    // Отправка запроса к OpenAI API
    const response = await $fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: requestData,
      retry: 3,
      retryDelay: 1000,
    });

    return response;
  } catch (error: any) {
    console.error('OpenAI API Error:', error);

    // Обработка специфичных ошибок OpenAI
    if (error.statusCode === 429) {
      throw createError({
        statusCode: 429,
        statusMessage: 'Превышен лимит запросов к OpenAI API',
      });
    }

    if (error.statusCode === 401) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Неверный API ключ OpenAI',
      });
    }

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.data?.error?.message || error.message || 'Ошибка при обращении к OpenAI API',
    });
  }
});
