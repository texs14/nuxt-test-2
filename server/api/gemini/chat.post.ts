/**
 * Server API endpoint для работы с Google Gemini API
 * POST /api/gemini/chat
 */

import { GEMINI_DEFAULT_CONFIG } from '~/config/gemini';

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

interface GeminiContent {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface GeminiResponse {
  candidates: {
    content: {
      parts: { text: string }[];
      role: string;
    };
    finishReason: string;
    safetyRatings?: any[];
  }[];
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const geminiKey = config.geminiKey;

  // Проверка наличия API ключа
  if (!geminiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Gemini API key не настроен',
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

  // Трансформация messages в формат Gemini
  const contents: GeminiContent[] = [];
  let systemInstruction = '';

  for (const message of body.messages) {
    if (message.role === 'system') {
      // Gemini обрабатывает system через отдельное поле
      systemInstruction = message.content;
    } else if (message.role === 'user') {
      contents.push({
        role: 'user',
        parts: [{ text: message.content }],
      });
    } else if (message.role === 'assistant') {
      contents.push({
        role: 'model',
        parts: [{ text: message.content }],
      });
    }
  }

  // Если есть system instruction, добавляем его как первый user message
  if (systemInstruction && contents.length > 0) {
    contents[0].parts[0].text = `${systemInstruction}\n\n${contents[0].parts[0].text}`;
  }

  // Подготовка модели
  const model = body.model || GEMINI_DEFAULT_CONFIG.model;

  // Подготовка конфигурации генерации
  const generationConfig = {
    temperature: body.temperature ?? GEMINI_DEFAULT_CONFIG.temperature,
    maxOutputTokens: body.max_tokens || GEMINI_DEFAULT_CONFIG.maxTokens,
    topP: body.top_p ?? 1,
    responseMimeType: 'application/json',
  };

  // Формирование URL с API ключом
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;

  try {
    // Отправка запроса к Gemini API
    const response = await $fetch<GeminiResponse>(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        contents,
        generationConfig,
      },
      retry: 3,
      retryDelay: 1000,
    });

    // Извлечение текста из ответа
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Пустой ответ от Gemini API',
      });
    }

    // Преобразование в формат OpenAI для совместимости
    return {
      id: `gemini-${Date.now()}`,
      choices: [
        {
          message: {
            role: 'assistant',
            content: text,
          },
          finish_reason: response.candidates[0].finishReason.toLowerCase(),
        },
      ],
      usage: response.usageMetadata
        ? {
            prompt_tokens: response.usageMetadata.promptTokenCount,
            completion_tokens: response.usageMetadata.candidatesTokenCount,
            total_tokens: response.usageMetadata.totalTokenCount,
          }
        : undefined,
    };
  } catch (error: any) {
    // Обработка специфичных ошибок Gemini
    if (error.statusCode === 429) {
      throw createError({
        statusCode: 429,
        statusMessage: 'Превышен лимит запросов к Gemini API',
      });
    }

    if (error.statusCode === 403) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Неверный API ключ Gemini или запрещенный контент',
      });
    }

    if (error.statusCode === 400) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Невалидный запрос к Gemini API',
      });
    }

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage:
        error.data?.error?.message || error.message || 'Ошибка при обращении к Gemini API',
    });
  }
});
