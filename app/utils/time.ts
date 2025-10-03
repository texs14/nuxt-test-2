/**
 * Утилиты для работы со временем
 */

/**
 * Форматирует секунды в формат M:SS
 */
export const formatTime = (sec: number): string => {
  const s = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
};

/**
 * Ограничивает время минимальным и максимальным значением
 */
export const clampTime = (time: number, min: number, max: number): number => {
  return Math.max(min, Math.min(time, max));
};
