import type { DictionaryEntry, Headword } from '~~/types/dictionary';
import { hasValidAudio, createAudioAsset, blobToBase64 } from '~~/utils/audio-manager';

/**
 * Composable для автоматического синтеза аудио для словарных записей
 *
 * @example
 * const { synthesizeAndSave, isSynthesizing, synthesisError } = useAudioSynthesis({
 *   voiceUuid: 'thai-voice-uuid'
 * });
 *
 * await synthesizeAndSave(entry);
 */

interface AudioSynthesisOptions {
  /** UUID голоса для тайского языка */
  voiceUuid?: string;
  /** Частота дискретизации */
  sampleRate?: number;
  /** Формат аудио */
  outputFormat?: 'wav' | 'mp3';
}

export function useAudioSynthesis(options?: AudioSynthesisOptions) {
  const isSynthesizing = ref(false);
  const synthesisError = ref<string | null>(null);
  const progress = ref<'checking' | 'synthesizing' | 'saving' | 'done'>('checking');

  // Используем useResembleTTS для синтеза
  const {
    synthesize,
    loading: ttsLoading,
    error: ttsError,
  } = useResembleTTS({
    defaultVoiceUuid: options?.voiceUuid,
    defaultSampleRate: options?.sampleRate || 44100,
    defaultOutputFormat: options?.outputFormat || 'wav',
    defaultPrecision: 'PCM_32',
  });

  /**
   * Очистка состояния ошибки
   */
  function clearError() {
    synthesisError.value = null;
  }

  /**
   * Проверяет, нужно ли синтезировать аудио для записи
   */
  function needsSynthesis(entry: DictionaryEntry): boolean {
    return !hasValidAudio(entry.headword);
  }

  /**
   * Синтезирует и сохраняет аудио для словарной записи
   *
   * @param entry - словарная запись
   * @returns true если успешно, false при ошибке
   */
  async function synthesizeAndSave(entry: DictionaryEntry): Promise<boolean> {
    isSynthesizing.value = true;
    synthesisError.value = null;
    progress.value = 'checking';

    try {
      // 1. Проверка необходимости синтеза
      if (!needsSynthesis(entry)) {
        synthesisError.value = 'Аудио уже существует';
        return false;
      }

      // Проверка наличия voice UUID
      if (!options?.voiceUuid) {
        synthesisError.value = 'Voice UUID не настроен. Укажите его в опциях useAudioSynthesis';
        return false;
      }

      // 2. Синтез речи через Resemble AI
      progress.value = 'synthesizing';
      const text = entry.headword.script;

      const result = await synthesize(text, {
        voiceUuid: options.voiceUuid,
        sampleRate: options.sampleRate || 44100,
        outputFormat: options.outputFormat || 'wav',
      });

      if (!result || ttsError.value) {
        synthesisError.value = ttsError.value || 'Ошибка синтеза аудио';
        return false;
      }

      // 3. Конвертация Blob в base64
      const audioBase64 = await blobToBase64(result.audioBlob);

      // 4. Создание MediaAsset
      const audioAsset = createAudioAsset(audioBase64, {
        type: 'word',
        speaker: 'resemble_ai_thai',
        url: result.audioUrl,
      });

      // 5. Сохранение в базу данных через server endpoint
      progress.value = 'saving';
      const response = await $fetch('/api/dictionary/update-audio', {
        method: 'PATCH',
        body: {
          entryId: entry.entryId,
          audio: audioAsset,
        },
      });

      if (!response.success) {
        synthesisError.value = 'Ошибка сохранения аудио в базу данных';
        return false;
      }

      progress.value = 'done';
      return true;
    } catch (error: any) {
      console.error('Audio synthesis error:', error);
      synthesisError.value = error.message || error.data?.message || 'Неизвестная ошибка';
      return false;
    } finally {
      isSynthesizing.value = false;
    }
  }

  /**
   * Синтезирует аудио для записи по её ID
   *
   * @param entryId - ID словарной записи
   * @param headword - объект headword из записи
   * @returns true если успешно
   */
  async function synthesizeById(entryId: string, headword: Headword): Promise<boolean> {
    // Создаем временный объект DictionaryEntry
    const tempEntry: DictionaryEntry = {
      entryId,
      headword,
      senses: [],
    };

    return await synthesizeAndSave(tempEntry);
  }

  return {
    isSynthesizing: readonly(isSynthesizing),
    synthesisError: readonly(synthesisError),
    progress: readonly(progress),
    needsSynthesis,
    synthesizeAndSave,
    synthesizeById,
    clearError,
  };
}
