/**
 * Composable для перевода субтитров с тайского на русский и английский
 * Использует Gemini API через useGemini
 */

import type { GeminiChatMessage } from './useGemini';

export interface TranslationResult {
  en: string;
  ru: string;
}

export function useSubtitleTranslation() {
  const { chatJSON, loading, error, clearError } = useGemini();

  /**
   * Переводит текст с тайского на английский и русский
   * @param thaiText - текст на тайском языке
   * @returns объект с переводами на английский и русский
   */
  async function translateSubtitle(thaiText: string): Promise<TranslationResult | null> {
    if (!thaiText || !thaiText.trim()) {
      return null;
    }

    const messages: GeminiChatMessage[] = [
      {
        role: 'system',
        content: `You are a professional translator specializing in Thai to English and Russian translations. 
Your task is to translate Thai text accurately while preserving the meaning and context.
Always respond with a JSON object containing "en" and "ru" fields with the translations.`,
      },
      {
        role: 'user',
        content: `Translate the following Thai text to English and Russian. Return ONLY a JSON object with "en" and "ru" fields:

Thai text: ${thaiText}

Response format:
{
  "en": "English translation here",
  "ru": "Russian translation here"
}`,
      },
    ];

    const result = await chatJSON<TranslationResult>(messages, {
      temperature: 0.3, // Низкая температура для более точного перевода
      max_tokens: 500,
    });

    return result;
  }

  /**
   * Пакетный перевод нескольких субтитров за один запрос
   * @param thaiTexts - массив текстов на тайском
   * @returns массив переводов
   */
  async function translateBatch(thaiTexts: string[]): Promise<TranslationResult[] | null> {
    const validTexts = thaiTexts.filter((text) => text && text.trim());

    if (validTexts.length === 0) {
      return null;
    }

    const messages: GeminiChatMessage[] = [
      {
        role: 'system',
        content: `You are a professional translator specializing in Thai to English and Russian translations.
Translate each Thai text accurately while preserving meaning and context.
Always respond with a JSON array of objects, each containing "en" and "ru" fields.`,
      },
      {
        role: 'user',
        content: `Translate the following Thai texts to English and Russian. Return ONLY a JSON array:

${validTexts.map((text, i) => `${i + 1}. ${text}`).join('\n')}

Response format:
[
  { "en": "English translation 1", "ru": "Russian translation 1" },
  { "en": "English translation 2", "ru": "Russian translation 2" }
]`,
      },
    ];

    const result = await chatJSON<TranslationResult[]>(messages, {
      temperature: 0.3,
      max_tokens: 2000,
    });

    return result;
  }

  return {
    translateSubtitle,
    translateBatch,
    loading,
    error,
    clearError,
  };
}
