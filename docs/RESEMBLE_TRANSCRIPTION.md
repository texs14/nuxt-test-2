# Интеграция Resemble.AI для транскрибации видео

Этот документ описывает интеграцию с Resemble.AI для автоматической транскрибации видео и создания субтитров с разделением по спикерам.

## Оглавление

- [Обзор](#обзор)
- [Архитектура](#архитектура)
- [Формат данных](#формат-данных)
- [Алгоритм разбивки по speaker_id](#алгоритм-разбивки-по-speaker_id)
- [Настройка](#настройка)
- [Использование](#использование)
- [Хранение данных](#хранение-данных)
- [Troubleshooting](#troubleshooting)

## Обзор

Resemble.AI используется для автоматической транскрибации аудио из видео файлов с определением говорящих (speaker diarization). Система разбивает транскрипцию на фразы на основе смены говорящего и автоматически создает временные метки для субтитров.

### Основные возможности

- Автоматическая транскрибация тайского языка
- Определение нескольких говорящих (speaker diarization)
- Временные метки для каждого слова
- Автоматическое создание субтитров с группировкой по спикерам
- Асинхронная обработка с polling статуса

## Архитектура

### Компоненты

1. **Server API Endpoints**
   - `POST /api/resemble/transcribe` - Запуск транскрибации
   - `GET /api/resemble/transcription/[uuid]` - Получение статуса и результата

2. **Client Components**
   - `ResembleTranscriptionLoader.vue` - Компонент для отслеживания статуса
   - Интеграция в `videos/add-new.vue` и `lessons/add-new.vue`

3. **Utilities**
   - `utils/resemble-transcription-adapter.ts` - Преобразование данных

4. **Types**
   - `types/resemble.ts` - TypeScript типы

### Поток данных

```
1. Пользователь загружает видео
   ↓
2. webhook-upload.post.ts извлекает аудио и загружает в Supabase Storage
   ↓
3. Отправляется запрос к Resemble.AI через /api/resemble/transcribe
   ↓
4. ResembleTranscriptionLoader опрашивает статус через /api/resemble/transcription/[uuid]
   ↓
5. При завершении: convertResembleWordsToSubtitles преобразует words в SubtitleItem[]
   ↓
6. Субтитры отображаются в редакторе и сохраняются в БД
```

## Формат данных

### Ответ от Resemble.AI

```json
{
  "uuid": "ef2e6cda-bb00-493c-9e0d-a1c36362e96d",
  "text": "อีก ที 1 2 3",
  "words": [
    {
      "text": "อีก",
      "start_time": 46.766,
      "end_time": 46.886,
      "speaker_id": 1
    },
    {
      "text": "ที",
      "start_time": 46.996,
      "end_time": 47.166,
      "speaker_id": 1
    },
    {
      "text": "1",
      "start_time": 47.906,
      "end_time": 48.166,
      "speaker_id": 2
    }
  ],
  "status": "completed",
  "created_at": "2025-10-17T06:01:45.906Z",
  "updated_at": "2025-10-17T06:03:41.202Z"
}
```

### TypeScript типы

```typescript
export interface ResembleTranscriptionWord {
  text: string; // Текст слова
  start_time: number; // Время начала (секунды)
  end_time: number; // Время окончания (секунды)
  speaker_id: number; // ID говорящего
}

export interface ResembleTranscriptionResponse {
  uuid: string;
  text: string;
  words: ResembleTranscriptionWord[];
  status: 'queued' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}
```

### Формат SubtitleItem

```typescript
export interface SubtitleItem {
  id?: number | string;
  start: number; // Начало (секунды)
  end: number; // Конец (секунды)
  text?: SubtitleText | string;
}

export interface SubtitleText {
  th?: string | ThaiSentences;
  en?: string;
  ru?: string;
}
```

## Алгоритм разбивки по speaker_id

### Принцип работы

Массив `words` разбивается на фразы на основе `speaker_id`. Когда текущий `speaker_id` отличается от предыдущего, начинается новая фраза.

### Расчет временных меток

- **Начало фразы**: `start_time` первого слова **минус 0.5 секунды**
- **Конец фразы**: `end_time` последнего слова
- Минимальное значение start: `0` (не уходит в отрицательные значения)

### Пример

**Входные данные:**

```json
[
  { "text": "อีก", "start_time": 46.766, "end_time": 46.886, "speaker_id": 1 },
  { "text": "ที", "start_time": 46.996, "end_time": 47.166, "speaker_id": 1 },
  { "text": "1", "start_time": 47.906, "end_time": 48.166, "speaker_id": 2 },
  { "text": "2", "start_time": 48.256, "end_time": 48.496, "speaker_id": 2 }
]
```

**Выходные данные (SubtitleItem[]):**

```json
[
  {
    "id": 1,
    "start": 46.266, // 46.766 - 0.5
    "end": 47.166,
    "text": { "th": "อีก ที" }
  },
  {
    "id": 2,
    "start": 47.406, // 47.906 - 0.5
    "end": 48.496,
    "text": { "th": "1 2" }
  }
]
```

### Код реализации

```typescript
export function convertResembleWordsToSubtitles(
  words: ResembleTranscriptionWord[]
): SubtitleItem[] {
  const subtitles: SubtitleItem[] = [];
  let currentPhrase: ResembleTranscriptionWord[] = [];
  let currentSpeakerId: number | null = null;

  for (const word of words) {
    // Если спикер изменился, завершаем текущую фразу
    if (currentSpeakerId !== null && word.speaker_id !== currentSpeakerId) {
      if (currentPhrase.length > 0) {
        subtitles.push(createSubtitleFromWords(currentPhrase, subtitles.length + 1));
      }
      currentPhrase = [];
    }
    currentPhrase.push(word);
    currentSpeakerId = word.speaker_id;
  }

  // Добавляем последнюю фразу
  if (currentPhrase.length > 0) {
    subtitles.push(createSubtitleFromWords(currentPhrase, subtitles.length + 1));
  }

  return subtitles;
}

function createSubtitleFromWords(words: ResembleTranscriptionWord[], id: number): SubtitleItem {
  const firstWord = words[0];
  const lastWord = words[words.length - 1];

  return {
    id,
    start: Math.max(0, firstWord.start_time - 0.5),
    end: lastWord.end_time,
    text: {
      th: words.map((w) => w.text).join(' '),
    },
  };
}
```

## Настройка

### 1. Получение API ключей

1. Зарегистрируйтесь на [Resemble.AI](https://resemble.ai)
2. Создайте проект или используйте существующий
3. Получите API ключ для транскрибации
4. Скопируйте UUID проекта (опционально)

### 2. Конфигурация переменных окружения

Создайте файл `.env` на основе `.env.example`:

```bash
# Resemble AI (для синтеза речи и транскрибации)
RESEMBLE_KEY=your-resemble-api-key
RESEMBLE_PROJECT_UUID=your-resemble-project-uuid  # Опционально
```

### 3. Проверка конфигурации

Убедитесь, что переменные добавлены в `nuxt.config.ts`:

```typescript
runtimeConfig: {
  resembleKey: process.env.RESEMBLE_KEY,
  resembleProjectUuid: process.env.RESEMBLE_PROJECT_UUID,
}
```

## Использование

### Загрузка видео с транскрибацией

1. Перейдите на страницу `/videos/add-new` или `/lessons/add-new`
2. Выберите видео файл
3. Дождитесь загрузки на сервер
4. Транскрибация запустится автоматически
5. Статус отображается в компоненте `ResembleTranscriptionLoader`
6. После завершения субтитры появятся в редакторе

### Программное использование

```typescript
// В вашем компоненте
import { ref } from 'vue';

const resembleUuid = ref<string>('');

// После загрузки видео
const response = await uploadVideo(videoFile);
if (response.resemble?.uuid) {
  resembleUuid.value = response.resemble.uuid;
}

// Обработка завершения
function onResembleCompleted(segments: SubtitleItem[]) {
  editorSubtitles.value = normalizeEditorSubtitles(segments);
}
```

```vue
<template>
  <ResembleTranscriptionLoader
    v-if="resembleUuid"
    :uuid="resembleUuid"
    @completed="onResembleCompleted"
    @status="handleStatus"
    @error="handleError"
  />
</template>
```

## Хранение данных

### Supabase Storage

Файлы хранятся в следующих buckets:

- **Videos** - оригинальные видео и превью
- **Audios** - извлеченные MP3 файлы

### База данных

Субтитры сохраняются в таблицах:

- **video_items** - для видео контента
- **lesson_items** - для уроков

#### Структура поля subtitles

```json
{
  "subtitles": [
    {
      "id": 1,
      "start": 46.266,
      "end": 47.166,
      "text": {
        "th": {
          "sentences": [["อีก", "ที"]]
        }
      }
    }
  ]
}
```

## Troubleshooting

### Ошибка: "Resemble Transcription API key не настроен"

**Решение:**

- Проверьте наличие `RESEMBLE_KEY` в файле `.env`
- Перезапустите сервер разработки

### Ошибка: "Audio URL is not publicly accessible"

**Решение:**

- Проверьте настройки Supabase Storage
- Убедитесь, что bucket имеет правильные права доступа
- Проверьте signed URL в конфигурации

### Транскрибация зависла в статусе "processing"

**Причины:**

- Длинное аудио (может занять несколько минут)
- Проблемы на стороне Resemble.AI

**Решение:**

- Дождитесь завершения (до 10 минут для длинных видео)
- Проверьте статус вручную через API
- Проверьте лимиты вашего аккаунта Resemble.AI

### Неправильное разделение фраз

**Причины:**

- Плохое качество аудио
- Перекрывающиеся голоса
- Фоновый шум

**Решение:**

- Используйте качественное аудио
- Редактируйте субтитры вручную в SubtitleEditor
- Настройте параметры speaker diarization в Resemble.AI

### Ошибка импорта модулей

**Симптомы:**

```
Cannot find module '~/types/resemble'
```

**Решение:**

- Используйте правильный алиас: `~~/types/resemble` для server-side
- Используйте `@/types/resemble` для компонентов
- Перезапустите TypeScript сервер в IDE

## API Reference

### POST /api/resemble/transcribe

Запускает транскрибацию аудио файла.

**Request:**

```json
{
  "audio_url": "https://example.com/audio.mp3",
  "project_uuid": "optional-project-uuid"
}
```

**Response:**

```json
{
  "uuid": "transcription-uuid",
  "status": "queued",
  "created_at": "2025-10-17T06:01:45.906Z"
}
```

### GET /api/resemble/transcription/[uuid]

Получает статус и результат транскрибации.

**Response:**

```json
{
  "uuid": "transcription-uuid",
  "text": "full transcription text",
  "words": [...],
  "status": "completed",
  "created_at": "2025-10-17T06:01:45.906Z",
  "updated_at": "2025-10-17T06:03:41.202Z"
}
```

## Дополнительные ресурсы

- [Resemble.AI Documentation](https://resemble.ai/docs)
- [Resemble.AI API Reference](https://resemble.ai/docs/api)
- [Документация проекта Thai Platform](../README.md)
