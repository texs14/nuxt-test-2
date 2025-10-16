import type {
  ResembleSynthesizeRequest,
  ResembleSynthesizeResponse,
  ResembleTTSOptions,
  ResembleTTSResult,
  ResembleOutputFormat,
  ResemblePrecision,
} from '~~/types/resemble';

/**
 * Composable для работы с Resemble AI Text-to-Speech API
 *
 * @param options - опции настройки по умолчанию
 * @returns объект с методами и реактивным состоянием
 *
 * @example
 * const { synthesize, loading, error, audioData } = useResembleTTS({
 *   defaultVoiceUuid: 'your-voice-uuid',
 *   defaultSampleRate: 48000,
 *   defaultOutputFormat: 'wav'
 * });
 *
 * const result = await synthesize('Привет, мир!');
 * if (result) {
 *   // Используйте result.audioUrl для воспроизведения
 * }
 */
export function useResembleTTS(options?: ResembleTTSOptions) {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const audioData = ref<ResembleTTSResult | null>(null);

  /**
   * Очистка состояния ошибки
   */
  function clearError() {
    error.value = null;
  }

  /**
   * Очистка аудио данных
   */
  function clearAudioData() {
    if (audioData.value?.audioUrl) {
      URL.revokeObjectURL(audioData.value.audioUrl);
    }
    audioData.value = null;
  }

  /**
   * Обработка ошибок
   */
  function handleError(err: any, defaultMessage: string): string {
    if (err.statusMessage) return err.statusMessage;
    if (err.message) return err.message;
    if (err.data?.message) return err.data.message;
    return defaultMessage;
  }

  /**
   * Декодирование base64 аудио в Blob
   */
  function base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  /**
   * Синтез речи из текста
   *
   * @param text - текст для преобразования в речь
   * @param synthesizeOptions - опции синтеза (переопределяют значения по умолчанию)
   * @returns результат синтеза или null в случае ошибки
   */
  async function synthesize(
    text: string,
    synthesizeOptions?: {
      voiceUuid?: string;
      projectUuid?: string;
      title?: string;
      sampleRate?: number;
      outputFormat?: ResembleOutputFormat;
      precision?: ResemblePrecision;
    }
  ): Promise<ResembleTTSResult | null> {
    loading.value = true;
    error.value = null;
    clearAudioData();

    // Валидация текста
    if (!text || text.trim().length === 0) {
      error.value = 'Текст не может быть пустым';
      loading.value = false;
      return null;
    }

    // Подготовка параметров запроса
    const voiceUuid = synthesizeOptions?.voiceUuid || options?.defaultVoiceUuid;

    if (!voiceUuid) {
      error.value = 'Voice UUID обязателен. Укажите его в опциях или при вызове synthesize';
      loading.value = false;
      return null;
    }

    const requestData: ResembleSynthesizeRequest = {
      voice_uuid: voiceUuid,
      data: `<speak><lang xml:lang="th-th">${text}</lang></speak>`,
      sample_rate: synthesizeOptions?.sampleRate || options?.defaultSampleRate || 48000,
      output_format: synthesizeOptions?.outputFormat || options?.defaultOutputFormat || 'wav',
      precision: synthesizeOptions?.precision || options?.defaultPrecision || 'PCM_32',
    };

    // Добавление опциональных параметров
    if (synthesizeOptions?.projectUuid) {
      requestData.project_uuid = synthesizeOptions.projectUuid;
    }
    if (synthesizeOptions?.title) {
      requestData.title = synthesizeOptions.title;
    }

    try {
      // Отправка запроса через наш server endpoint
      const response = await $fetch<ResembleSynthesizeResponse>('/api/resemble/synthesize', {
        method: 'POST',
        body: requestData,
      });

      // Определение MIME типа на основе формата
      const mimeType = requestData.output_format === 'mp3' ? 'audio/mpeg' : 'audio/wav';

      // Декодирование base64 в Blob
      const audioBlob = base64ToBlob(response.audio_content, mimeType);

      // Создание URL для воспроизведения
      const audioUrl = URL.createObjectURL(audioBlob);

      // Формирование результата
      const result: ResembleTTSResult = {
        audioBlob,
        audioUrl,
        duration: response.duration,
        timestamps: response.audio_timestamps,
        format: response.output_format,
        sampleRate: response.sample_rate,
      };

      audioData.value = result;
      return result;
    } catch (err: any) {
      error.value = handleError(err, 'Ошибка при синтезе речи');
      return null;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Синтез речи и автоматическое воспроизведение
   *
   * @param text - текст для преобразования в речь
   * @param synthesizeOptions - опции синтеза
   * @returns HTMLAudioElement для управления воспроизведением или null
   */
  async function synthesizeAndPlay(
    text: string,
    synthesizeOptions?: Parameters<typeof synthesize>[1]
  ): Promise<HTMLAudioElement | null> {
    const result = await synthesize(text, synthesizeOptions);

    if (!result) {
      return null;
    }

    const audio = new Audio(result.audioUrl);

    try {
      await audio.play();
      return audio;
    } catch (playError: any) {
      error.value = `Ошибка воспроизведения: ${playError.message}`;
      return null;
    }
  }

  /**
   * Очистка ресурсов при размонтировании компонента
   */
  onUnmounted(() => {
    clearAudioData();
  });

  return {
    loading: readonly(loading),
    error: readonly(error),
    audioData: readonly(audioData),
    synthesize,
    synthesizeAndPlay,
    clearError,
    clearAudioData,
  };
}
