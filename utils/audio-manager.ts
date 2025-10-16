import type { MediaAsset, Headword } from '~~/types/dictionary';

/**
 * Менеджер для работы с аудио в словарных записях
 */

/**
 * Проверяет наличие валидного base64 аудио в записи
 */
export function hasValidAudio(headword: Headword): boolean {
  if (!headword.audio || headword.audio.length === 0) {
    return false;
  }

  // Проверяем наличие хотя бы одного аудио с base64
  return headword.audio.some((audio) => {
    if (!audio.base64) return false;
    
    // Проверяем, что base64 не пустая строка
    const base64Content = audio.base64.replace(/^data:audio\/[^;]+;base64,/, '');
    return base64Content.length > 0;
  });
}

/**
 * Создает новый MediaAsset для аудио
 */
export function createAudioAsset(
  base64: string,
  options?: {
    url?: string;
    type?: string;
    speaker?: string;
    license?: string;
  }
): MediaAsset {
  const mediaId = `audio_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  return {
    mediaId,
    base64,
    url: options?.url,
    type: options?.type || 'word',
    speaker: options?.speaker || 'resemble_ai_thai',
    license: options?.license || 'generated',
  };
}

/**
 * Добавляет или обновляет аудио в массиве audio
 * Если аудио с типом "word" уже существует, обновляет его
 * Иначе добавляет новое
 */
export function addOrUpdateAudio(
  currentAudio: MediaAsset[] | undefined,
  newAudio: MediaAsset
): MediaAsset[] {
  const audioArray = currentAudio || [];
  
  // Ищем существующее аудио с типом "word"
  const wordAudioIndex = audioArray.findIndex((audio) => audio.type === 'word');
  
  if (wordAudioIndex !== -1) {
    // Обновляем существующее аудио
    const updatedArray = [...audioArray];
    updatedArray[wordAudioIndex] = newAudio;
    return updatedArray;
  } else {
    // Добавляем новое аудио в начало массива
    return [newAudio, ...audioArray];
  }
}

/**
 * Создает обновленный объект headword с новым аудио
 */
export function updateHeadwordWithAudio(
  headword: Headword,
  audioBase64: string,
  options?: {
    url?: string;
    speaker?: string;
  }
): Headword {
  const newAudio = createAudioAsset(audioBase64, {
    type: 'word',
    speaker: options?.speaker || 'resemble_ai_thai',
    url: options?.url,
  });

  const updatedAudio = addOrUpdateAudio(headword.audio, newAudio);

  return {
    ...headword,
    audio: updatedAudio,
  };
}

/**
 * Конвертирует Blob в base64 с data URI
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Ошибка конвертации в base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Извлекает чистый base64 без data URI префикса
 */
export function extractBase64Content(dataUri: string): string {
  return dataUri.replace(/^data:audio\/[^;]+;base64,/, '');
}

/**
 * Проверяет валидность base64 строки
 */
export function isValidBase64(str: string): boolean {
  if (!str || typeof str !== 'string') {
    return false;
  }

  // Удаляем data URI префикс если есть
  const base64Content = extractBase64Content(str);
  
  // Проверяем формат base64
  const base64Regex = /^[A-Za-z0-9+/]+=*$/;
  return base64Content.length > 0 && base64Regex.test(base64Content);
}
