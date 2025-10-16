/**
 * Типы для работы с Resemble AI Text-to-Speech API
 */

/**
 * Форматы вывода аудио
 */
export type ResembleOutputFormat = 'mp3' | 'wav';

/**
 * Точность/кодирование аудио
 */
export type ResemblePrecision = 'PCM_16' | 'PCM_24' | 'PCM_32' | 'MULAW';

/**
 * Параметры запроса синхронного синтеза речи
 */
export interface ResembleSynthesizeRequest {
  /** UUID голоса для синтеза */
  voice_uuid: string;
  /** Текст для преобразования в речь */
  data: string;
  /** UUID проекта (опционально) */
  project_uuid?: string;
  /** Название клипа (опционально) */
  title?: string;
  /** Частота дискретизации в Гц (например, 48000) */
  sample_rate?: number;
  /** Формат вывода аудио */
  output_format?: ResembleOutputFormat;
  /** Точность/кодирование аудио */
  precision?: ResemblePrecision;
}

/**
 * Временные метки аудио для синхронизации
 */
export interface ResembleAudioTimestamps {
  /** Массив графемных символов */
  graph_chars: string[];
  /** Временные метки для графемных символов */
  graph_times: number[][];
  /** Массив фонемных символов */
  phon_chars: string[];
  /** Временные метки для фонемных символов */
  phon_times: number[][];
}

/**
 * Ответ от API синхронного синтеза речи
 */
export interface ResembleSynthesizeResponse {
  /** Base64-закодированное аудио содержимое */
  audio_content: string;
  /** Временные метки для синхронизации */
  audio_timestamps: ResembleAudioTimestamps;
  /** Длительность аудио в секундах */
  duration: number;
  /** Массив проблем/предупреждений */
  issues: string[];
  /** Формат вывода аудио */
  output_format: string;
  /** Частота дискретизации */
  sample_rate: number;
  /** Флаг успешного выполнения */
  success: boolean;
  /** Время синтеза в секундах */
  synth_duration: number;
  /** Название клипа или null */
  title: string | null;
}

/**
 * Опции для composable useResembleTTS
 */
export interface ResembleTTSOptions {
  /** UUID голоса по умолчанию */
  defaultVoiceUuid?: string;
  /** Частота дискретизации по умолчанию */
  defaultSampleRate?: number;
  /** Формат вывода по умолчанию */
  defaultOutputFormat?: ResembleOutputFormat;
  /** Точность по умолчанию */
  defaultPrecision?: ResemblePrecision;
}

/**
 * Результат синтеза речи
 */
export interface ResembleTTSResult {
  /** Аудио данные в формате Blob */
  audioBlob: Blob;
  /** URL для воспроизведения аудио */
  audioUrl: string;
  /** Длительность аудио в секундах */
  duration: number;
  /** Временные метки для синхронизации */
  timestamps: ResembleAudioTimestamps;
  /** Формат аудио */
  format: string;
  /** Частота дискретизации */
  sampleRate: number;
}
