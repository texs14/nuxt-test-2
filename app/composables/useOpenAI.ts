/**
 * Composable для работы с OpenAI API
 * Использует Chat Completions API для взаимодействия с GPT-4
 */

interface OpenAIChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIChatOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
}

interface OpenAIChatResponse {
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

export function useOpenAI() {
  const loading = ref(false);
  const error = ref<string | null>(null);

  /**
   * Очистка ошибки
   */
  function clearError() {
    error.value = null;
  }

  /**
   * Основной метод для работы с Chat Completions API
   * 
   * @param messages - массив сообщений для отправки
   * @param options - дополнительные параметры
   * @returns ответ от GPT
   */
  async function chat(
    messages: OpenAIChatMessage[],
    options?: OpenAIChatOptions
  ): Promise<string | null> {
    loading.value = true;
    error.value = null;

    try {
      const response = await $fetch<OpenAIChatResponse>('/api/openai/chat', {
        method: 'POST',
        body: {
          messages,
          model: options?.model || 'gpt-4',
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.max_tokens || 2000,
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
      console.error('OpenAI API error:', err);
      
      if (err.statusCode === 429) {
        error.value = 'Превышен лимит запросов. Попробуйте позже.';
      } else if (err.statusCode === 401) {
        error.value = 'Ошибка аутентификации API.';
      } else if (err.statusCode === 500) {
        error.value = 'Ошибка сервера OpenAI.';
      } else {
        error.value = err.data?.message || err.message || 'Неизвестная ошибка OpenAI API';
      }
      
      return null;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Метод для работы с JSON ответами
   * Автоматически парсит JSON из ответа GPT
   */
  async function chatJSON<T = any>(
    messages: OpenAIChatMessage[],
    options?: OpenAIChatOptions
  ): Promise<T | null> {
    const response = await chat(messages, options);
    
    if (!response) {
      return null;
    }

    try {
      // Пытаемся извлечь JSON из markdown кодового блока
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : response;
      
      return JSON.parse(jsonString.trim());
    } catch (err) {
      console.error('JSON parse error:', err);
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
