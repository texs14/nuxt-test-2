# Resemble AI Text-to-Speech - Руководство по использованию

Документация по использованию composable `useResembleTTS` для преобразования текста в речь с помощью Resemble AI.

## Оглавление

- [Конфигурация](#конфигурация)
- [Основное использование](#основное-использование)
- [API Reference](#api-reference)
- [Примеры](#примеры)
- [Обработка ошибок](#обработка-ошибок)
- [TypeScript типы](#typescript-типы)

## Конфигурация

### Переменные окружения

Добавьте ваш API ключ Resemble AI в файл `.env`:

```env
RESEMBLE_KEY=your_resemble_api_key_here
```

### Runtime Config

API ключ автоматически загружается из `nuxt.config.ts`:

```typescript
runtimeConfig: {
  resembleKey: process.env.RESEMBLE_KEY,
}
```

## Основное использование

### Базовый пример

```vue
<script setup lang="ts">
const { synthesize, loading, error, audioData } = useResembleTTS({
  defaultVoiceUuid: 'your-voice-uuid',
  defaultSampleRate: 48000,
  defaultOutputFormat: 'wav'
});

const handleSynthesize = async () => {
  const result = await synthesize('Привет, мир!');
  
  if (result) {
    console.log('Аудио URL:', result.audioUrl);
    console.log('Длительность:', result.duration);
  }
};
</script>

<template>
  <div>
    <button @click="handleSynthesize" :disabled="loading">
      {{ loading ? 'Синтез...' : 'Озвучить текст' }}
    </button>
    
    <div v-if="error" class="error">{{ error }}</div>
    
    <audio v-if="audioData" :src="audioData.audioUrl" controls />
  </div>
</template>
```

### Автоматическое воспроизведение

```typescript
const { synthesizeAndPlay, loading, error } = useResembleTTS({
  defaultVoiceUuid: 'your-voice-uuid'
});

const handlePlay = async () => {
  const audio = await synthesizeAndPlay('Текст для озвучки');
  
  if (audio) {
    // Можно управлять воспроизведением
    audio.addEventListener('ended', () => {
      console.log('Воспроизведение завершено');
    });
  }
};
```

## API Reference

### `useResembleTTS(options?)`

Создает composable для работы с Resemble AI TTS.

#### Параметры

- **options** `ResembleTTSOptions` (опционально)
  - `defaultVoiceUuid` - UUID голоса по умолчанию
  - `defaultSampleRate` - Частота дискретизации (по умолчанию: 48000)
  - `defaultOutputFormat` - Формат вывода: `'wav'` | `'mp3'` (по умолчанию: `'wav'`)
  - `defaultPrecision` - Точность: `'PCM_16'` | `'PCM_24'` | `'PCM_32'` | `'MULAW'` (по умолчанию: `'PCM_32'`)

#### Возвращаемое значение

Объект с методами и реактивным состоянием:

- **loading** `Ref<boolean>` - Индикатор загрузки
- **error** `Ref<string | null>` - Сообщение об ошибке
- **audioData** `Ref<ResembleTTSResult | null>` - Результат синтеза
- **synthesize(text, options?)** - Синтез речи из текста
- **synthesizeAndPlay(text, options?)** - Синтез и автоматическое воспроизведение
- **clearError()** - Очистка ошибки
- **clearAudioData()** - Очистка аудио данных

### `synthesize(text, options?)`

Преобразует текст в речь.

#### Параметры

- **text** `string` - Текст для озвучки (обязательный)
- **options** (опционально)
  - `voiceUuid` - UUID голоса (переопределяет значение по умолчанию)
  - `projectUuid` - UUID проекта Resemble AI
  - `title` - Название аудио клипа
  - `sampleRate` - Частота дискретизации
  - `outputFormat` - Формат вывода
  - `precision` - Точность аудио

#### Возвращает

`Promise<ResembleTTSResult | null>` - Объект с аудио данными или null при ошибке

```typescript
interface ResembleTTSResult {
  audioBlob: Blob;           // Аудио данные
  audioUrl: string;          // URL для воспроизведения
  duration: number;          // Длительность в секундах
  timestamps: ResembleAudioTimestamps; // Временные метки
  format: string;            // Формат аудио
  sampleRate: number;        // Частота дискретизации
}
```

## Примеры

### Пример 1: Озвучивание с разными голосами

```vue
<script setup lang="ts">
const voices = [
  { id: 'voice-1-uuid', name: 'Голос 1' },
  { id: 'voice-2-uuid', name: 'Голос 2' },
];

const selectedVoice = ref(voices[0].id);
const text = ref('');

const { synthesize, loading, error, audioData } = useResembleTTS();

const handleSynthesize = async () => {
  await synthesize(text.value, {
    voiceUuid: selectedVoice.value,
    outputFormat: 'mp3'
  });
};
</script>

<template>
  <div>
    <select v-model="selectedVoice">
      <option v-for="voice in voices" :key="voice.id" :value="voice.id">
        {{ voice.name }}
      </option>
    </select>
    
    <textarea v-model="text" placeholder="Введите текст..." />
    
    <button @click="handleSynthesize" :disabled="loading || !text">
      Синтезировать
    </button>
    
    <audio v-if="audioData" :src="audioData.audioUrl" controls autoplay />
  </div>
</template>
```

### Пример 2: Синхронизация текста с аудио

```vue
<script setup lang="ts">
const { synthesize, audioData } = useResembleTTS({
  defaultVoiceUuid: 'your-voice-uuid'
});

const text = 'Привет, мир!';
const highlightedIndex = ref(-1);

const handleSynthesize = async () => {
  const result = await synthesize(text);
  
  if (result && result.timestamps) {
    // Используйте timestamps для синхронизации
    console.log('Графемы:', result.timestamps.graph_chars);
    console.log('Временные метки:', result.timestamps.graph_times);
  }
};

// Пример синхронизации с аудио
const syncWithAudio = (currentTime: number) => {
  if (!audioData.value) return;
  
  const { graph_times } = audioData.value.timestamps;
  
  // Найти текущий символ на основе времени
  for (let i = 0; i < graph_times.length; i++) {
    const [start, end] = graph_times[i];
    if (currentTime >= start && currentTime <= end) {
      highlightedIndex.value = i;
      break;
    }
  }
};
</script>
```

### Пример 3: Сохранение аудио в файл

```vue
<script setup lang="ts">
const { synthesize } = useResembleTTS({
  defaultVoiceUuid: 'your-voice-uuid'
});

const handleDownload = async () => {
  const result = await synthesize('Текст для сохранения');
  
  if (result) {
    const link = document.createElement('a');
    link.href = result.audioUrl;
    link.download = `audio-${Date.now()}.${result.format}`;
    link.click();
  }
};
</script>
```

## Обработка ошибок

### Проверка ошибок

```typescript
const { synthesize, error } = useResembleTTS({
  defaultVoiceUuid: 'your-voice-uuid'
});

const handleSynthesize = async () => {
  const result = await synthesize('Текст');
  
  if (error.value) {
    console.error('Ошибка синтеза:', error.value);
    // Показать уведомление пользователю
    return;
  }
  
  if (result) {
    // Успешно
  }
};
```

### Возможные ошибки

- `"Текст не может быть пустым"` - Передан пустой текст
- `"Voice UUID обязателен..."` - Не указан UUID голоса
- `"Resemble API key не настроен"` - API ключ отсутствует в .env
- `"Ошибка синтеза речи: ..."` - Ошибка от Resemble AI API
- `"Ошибка при обращении к Resemble AI API"` - Сетевая ошибка

### Очистка состояния

```typescript
const { clearError, clearAudioData } = useResembleTTS();

// Очистить ошибку
clearError();

// Очистить аудио данные и освободить память
clearAudioData();
```

## TypeScript типы

### ResembleSynthesizeRequest

```typescript
interface ResembleSynthesizeRequest {
  voice_uuid: string;
  data: string;
  project_uuid?: string;
  title?: string;
  sample_rate?: number;
  output_format?: 'mp3' | 'wav';
  precision?: 'PCM_16' | 'PCM_24' | 'PCM_32' | 'MULAW';
}
```

### ResembleTTSResult

```typescript
interface ResembleTTSResult {
  audioBlob: Blob;
  audioUrl: string;
  duration: number;
  timestamps: ResembleAudioTimestamps;
  format: string;
  sampleRate: number;
}
```

### ResembleAudioTimestamps

```typescript
interface ResembleAudioTimestamps {
  graph_chars: string[];    // Массив графемных символов
  graph_times: number[][]; // Временные метки [start, end]
  phon_chars: string[];    // Массив фонемных символов
  phon_times: number[][]; // Временные метки [start, end]
}
```

## Лучшие практики

1. **Всегда указывайте Voice UUID**
   ```typescript
   const tts = useResembleTTS({
     defaultVoiceUuid: 'your-voice-uuid'
   });
   ```

2. **Очищайте аудио данные после использования**
   ```typescript
   onUnmounted(() => {
     clearAudioData(); // Автоматически вызывается composable
   });
   ```

3. **Обрабатывайте ошибки**
   ```typescript
   if (error.value) {
     // Показать сообщение пользователю
   }
   ```

4. **Используйте индикатор загрузки**
   ```vue
   <button :disabled="loading">
     {{ loading ? 'Синтез...' : 'Озвучить' }}
   </button>
   ```

5. **Выбирайте формат в зависимости от задачи**
   - WAV - для высокого качества и редактирования
   - MP3 - для меньшего размера файла и веб-воспроизведения

## Дополнительная информация

- [Официальная документация Resemble AI](https://docs.app.resemble.ai/docs/text_to_speech/synchronous)
- [Список доступных голосов](https://app.resemble.ai/voices)
- [API Reference Resemble AI](https://docs.app.resemble.ai/reference)
