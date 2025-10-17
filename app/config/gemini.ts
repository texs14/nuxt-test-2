/**
 * Конфигурация для Google Gemini API
 */

export const GEMINI_CONFIG = {
  model: 'gemini-2.5-flash-lite',
  temperature: 0.15,
  maxTokens: 2000,
} as const;

export const GEMINI_DEFAULT_CONFIG = {
  model: 'gemini-2.5-flash-lite',
  temperature: 0.15,
  maxTokens: 2000,
} as const;
