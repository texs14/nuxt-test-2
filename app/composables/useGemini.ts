/**
 * Composable для работы с Google Gemini API
 * Использует Gemini API для взаимодействия с AI моделями
 */

import { GEMINI_DEFAULT_CONFIG } from '~/config/gemini';

interface GeminiChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GeminiChatOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
}

interface GeminiChatResponse {
  id: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export function useGemini() {
  const loading = ref(false);
  const error = ref<string | null>(null);

  /**
   * Очистка ошибки
   */
  function clearError() {
    error.value = null;
  }

  /**
   * Основной метод для работы с Gemini API
   *
   * @param messages - массив сообщений для отправки
   * @param options - дополнительные параметры
   * @returns ответ от Gemini
   */
  async function chat(
    messages: GeminiChatMessage[],
    options?: GeminiChatOptions
  ): Promise<string | null> {
    loading.value = true;
    error.value = null;

    try {
      const response = await $fetch<GeminiChatResponse>('/api/gemini/chat', {
        method: 'POST',
        body: {
          messages,
          model: options?.model || GEMINI_DEFAULT_CONFIG.model,
          temperature: options?.temperature ?? GEMINI_DEFAULT_CONFIG.temperature,
          max_tokens: options?.max_tokens || GEMINI_DEFAULT_CONFIG.maxTokens,
          top_p: options?.top_p ?? 1,
        },
      });

      const content = response.choices?.[0]?.message?.content;

      if (!content) {
        error.value = 'Пустой ответ от API';
        return null;
      }

      return content;
    } catch (err: any) {
      if (err.statusCode === 429) {
        error.value = 'Превышен лимит запросов. Попробуйте позже.';
      } else if (err.statusCode === 403) {
        error.value = 'Ошибка аутентификации API или запрещенный контент.';
      } else if (err.statusCode === 400) {
        error.value = 'Невалидный запрос к API.';
      } else if (err.statusCode === 500) {
        error.value = 'Ошибка сервера Gemini.';
      } else {
        error.value = err.data?.message || err.message || 'Неизвестная ошибка Gemini API';
      }

      return null;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Метод для работы с JSON ответами
   * Автоматически парсит JSON из ответа Gemini
   */
  async function chatJSON<T = any>(
    messages: GeminiChatMessage[],
    options?: GeminiChatOptions
  ): Promise<T | null> {
    const response = await chat(messages, options);

    if (!response) {
      return null;
    }

    try {
      // Пытаемся извлечь JSON из markdown кодового блока
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch?.[1] || response;

      return JSON.parse(jsonString.trim());
    } catch (err) {
      error.value = 'Ошибка парсинга JSON ответа';
      return null;
    }
  }

  return {
    loading: readonly(loading),
    error: readonly(error),
    chat,
    chatJSON,
    clearError,
  };
}
