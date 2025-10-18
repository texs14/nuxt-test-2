# Автоматический синтез аудио для словарных записей

Руководство по использованию функционала автоматической генерации аудио произношения для тайских слов через Resemble AI.

## Оглавление

- [Обзор](#обзор)
- [Архитектура](#архитектура)
- [Конфигурация](#конфигурация)
- [Использование](#использование)
- [API Reference](#api-reference)
- [Примеры](#примеры)
- [Troubleshooting](#troubleshooting)

## Обзор

Система автоматически генерирует аудио произношение для слов в словаре `new_dictionar`, если:

- Поле `headword->audio` пустое, null или undefined
- Или массив `audio` не содержит валидного `base64`

**Workflow:**

1. Пользователь открывает слово через `InteractiveWord.vue`
2. Система проверяет наличие аудио
3. При отсутствии аудио показывается кнопка "Синтезировать аудио"
4. При клике: синтез → сохранение в Supabase → обновление UI

## Архитектура

### Компоненты

**1. `utils/audio-manager.ts`**

- Helper функции для работы с `MediaAsset[]`
- Проверка наличия валидного аудио
- Создание и обновление аудио объектов
- Конвертация Blob ↔ base64

**2. `server/api/dictionary/update-audio.ts`**

- Server endpoint для обновления JSONB поля
- Использует Supabase Service Key для обхода RLS
- Атомарное обновление массива `headword->audio`

**3. `app/composables/useAudioSynthesis.ts`**

- Composable для синтеза и сохранения аудио
- Интегрируется с `useResembleTTS`
- Управление состоянием процесса

**4. `app/components/InteractiveWord.vue`**

- UI для отображения и синтеза аудио
- Автоматическая проверка при открытии слова
- Индикация процесса и ошибок

### Структура данных

```typescript
// MediaAsset в headword->audio
{
  mediaId: "audio_1234567890_abc123",
  base64: "data:audio/wav;base64,UklGRiQAAABXQVZF...",
  type: "word",
  speaker: "resemble_ai_thai",
  license: "generated",
  url?: "https://..."  // опционально
}
```

## Конфигурация

### 1. Переменные окружения

В `.env` должен быть указан ключ Resemble AI:

```env
RESEMBLE_KEY=your_resemble_api_key
```

### 2. Voice UUID для тайского языка

В `InteractiveWord.vue` укажите UUID голоса:

```typescript
const { synthesizeById /* ... */ } = useAudioSynthesis({
  voiceUuid: 'YOUR_THAI_VOICE_UUID', // <-- Замените на реальный UUID
  sampleRate: 44100,
  outputFormat: 'wav',
});
```

**Как получить Voice UUID:**

1. Зайдите в [Resemble AI Dashboard](https://app.resemble.ai/voices)
2. Выберите или создайте тайский голос
3. Скопируйте UUID из URL или настроек голоса

### 3. Supabase Service Key

В `nuxt.config.ts` должен быть настроен service key:

```typescript
runtimeConfig: {
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
}
```

## Использование

### В компоненте InteractiveWord.vue

Функционал уже интегрирован. При открытии слова без аудио автоматически показывается кнопка:

```vue
<template>
  <div v-if="needsSynthesis(entry)">
    <UIButton @click="onSynthesizeAudio" :disabled="isSynthesizing" type="button">
      {{ isSynthesizing ? getSynthesisStatusText() : 'Синтезировать аудио' }}
    </UIButton>

    <div v-if="synthesisError">{{ synthesisError }}</div>
  </div>
</template>
```

### Программное использование

```typescript
import { useAudioSynthesis } from '~/composables/useAudioSynthesis';
import { hasValidAudio } from '~/utils/audio-manager';

// В компоненте
const { synthesizeById, isSynthesizing, synthesisError } = useAudioSynthesis({
  voiceUuid: 'your-thai-voice-uuid',
  sampleRate: 44100,
  outputFormat: 'wav',
});

// Синтез аудио для конкретного слова
const entry = { entryId: 'word-123', headword: { script: 'สวัสดี' /* ... */ } };

if (!hasValidAudio(entry.headword)) {
  const success = await synthesizeById(entry.entryId, entry.headword);

  if (success) {
    console.log('Аудио успешно синтезировано и сохранено');
  } else {
    console.error('Ошибка:', synthesisError.value);
  }
}
```

## API Reference

### `useAudioSynthesis(options)`

Создает composable для автоматического синтеза аудио.

#### Параметры

```typescript
interface AudioSynthesisOptions {
  voiceUuid?: string; // UUID голоса Resemble AI (обязательно)
  sampleRate?: number; // Частота дискретизации (по умолчанию: 44100)
  outputFormat?: 'wav' | 'mp3'; // Формат аудио (по умолчанию: 'wav')
}
```

#### Возвращаемое значение

```typescript
{
  isSynthesizing: Ref<boolean>;           // Идет ли синтез
  synthesisError: Ref<string | null>;     // Сообщение об ошибке
  progress: Ref<'checking' | 'synthesizing' | 'saving' | 'done'>;  // Текущий этап
  needsSynthesis: (entry) => boolean;     // Проверка необходимости синтеза
  synthesizeAndSave: (entry) => Promise<boolean>;  // Синтез для DictionaryEntry
  synthesizeById: (entryId, headword) => Promise<boolean>;  // Синтез по ID
  clearError: () => void;                 // Очистка ошибки
}
```

### Helper функции (`utils/audio-manager.ts`)

```typescript
// Проверка наличия валидного аудио
hasValidAudio(headword: Headword): boolean

// Создание MediaAsset
createAudioAsset(base64: string, options?: {...}): MediaAsset

// Добавление/обновление аудио в массиве
addOrUpdateAudio(currentAudio: MediaAsset[], newAudio: MediaAsset): MediaAsset[]

// Обновление headword с новым аудио
updateHeadwordWithAudio(headword: Headword, audioBase64: string, options?: {...}): Headword

// Конвертация Blob в base64
blobToBase64(blob: Blob): Promise<string>

// Валидация base64
isValidBase64(str: string): boolean
```

### Server API (`/api/dictionary/update-audio`)

**Method:** `PATCH`

**Request Body:**

```typescript
{
  entryId: string; // ID словарной записи
  audio: MediaAsset; // Новый аудио объект
}
```

**Response:**

```typescript
{
  success: boolean;
  data: {
    entryId: string;
    headword: Headword; // Обновленный headword
  }
}
```

## Примеры

### Пример 1: Базовое использование в компоненте

```vue
<script setup lang="ts">
const entry = ref<DictionaryEntry | null>(null);

const { synthesizeById, isSynthesizing, synthesisError, needsSynthesis } = useAudioSynthesis({
  voiceUuid: 'thai-voice-uuid-here',
});

const handleSynthesize = async () => {
  if (!entry.value) return;

  const success = await synthesizeById(entry.value.entryId, entry.value.headword);

  if (success) {
    // Перезагрузить данные из базы
    await loadEntry();
  }
};
</script>

<template>
  <div v-if="entry && needsSynthesis(entry)">
    <button @click="handleSynthesize" :disabled="isSynthesizing">
      {{ isSynthesizing ? 'Синтез...' : 'Озвучить' }}
    </button>
    <p v-if="synthesisError">{{ synthesisError }}</p>
  </div>
</template>
```

### Пример 2: Batch обработка слов

```typescript
async function synthesizeMultipleWords(entries: DictionaryEntry[]) {
  const { synthesizeById, needsSynthesis } = useAudioSynthesis({
    voiceUuid: 'thai-voice-uuid',
  });

  const wordsToSynthesize = entries.filter(needsSynthesis);

  for (const entry of wordsToSynthesize) {
    console.log(`Синтез: ${entry.headword.script}`);

    const success = await synthesizeById(entry.entryId, entry.headword);

    if (success) {
      console.log(`✓ ${entry.headword.script}`);
    } else {
      console.error(`✗ ${entry.headword.script}`);
    }

    // Пауза между запросами
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
```

### Пример 3: Проверка и обновление существующей записи

```typescript
import { hasValidAudio } from '~/utils/audio-manager';

// Получить запись
const { data } = await supabase
  .from('new_dictionar')
  .select('*')
  .eq('entry_id', 'word-123')
  .single();

if (data) {
  const headword = data.headword as Headword;

  if (!hasValidAudio(headword)) {
    console.log('Аудио отсутствует, запускаем синтез...');

    const { synthesizeById } = useAudioSynthesis({
      voiceUuid: 'thai-voice-uuid',
    });

    await synthesizeById(data.entry_id, headword);
  } else {
    console.log('Аудио уже существует');
  }
}
```

## Troubleshooting

### Ошибка: "Voice UUID не настроен"

**Решение:** Укажите voiceUuid в опциях useAudioSynthesis:

```typescript
const { synthesizeById } = useAudioSynthesis({
  voiceUuid: 'YOUR_VOICE_UUID', // Обязательно!
});
```

### Ошибка: "Resemble API key не настроен"

**Решение:**

1. Проверьте наличие `RESEMBLE_KEY` в `.env`
2. Перезапустите dev сервер

### Ошибка: "Запись с entry_id не найдена"

**Причины:**

- Неверный `entry_id`
- Запись удалена из базы

**Решение:** Проверьте существование записи в Supabase Dashboard.

### Ошибка синтеза: "Ошибка при обращении к Resemble AI API"

**Причины:**

- Неверный API ключ
- Проблемы с сетью
- Превышен лимит запросов

**Решение:**

1. Проверьте валидность `RESEMBLE_KEY`
2. Проверьте логи: `server/api/resemble/synthesize.ts`
3. Проверьте квоты в [Resemble Dashboard](https://app.resemble.ai)

### Аудио не сохраняется в базу

**Решение:**

1. Проверьте `SUPABASE_SERVICE_ROLE_KEY` в `.env`
2. Убедитесь, что таблица `new_dictionar` существует
3. Проверьте структуру `headword` JSONB поля

### Кнопка "Синтезировать" не отображается

**Причины:**

- Аудио уже существует в `headword->audio`
- Состояние `state !== 'loaded'`

**Решение:** Проверьте содержимое `entry.headword.audio` в devtools.

## Лучшие практики

1. **Всегда указывайте Voice UUID**

   ```typescript
   const tts = useAudioSynthesis({ voiceUuid: 'your-uuid' });
   ```

2. **Обрабатывайте ошибки**

   ```typescript
   if (!success) {
     alert(synthesisError.value);
   }
   ```

3. **Показывайте прогресс пользователю**

   ```vue
   <div v-if="isSynthesizing">
     {{ progress }} - {{ getSynthesisStatusText() }}
   </div>
   ```

4. **Не злоупотребляйте batch синтезом**
   - Используйте задержки между запросами
   - Следите за квотами Resemble AI

5. **Обновляйте кэш после синтеза**
   ```typescript
   delete cache.value[word];
   await reloadEntry();
   ```

## Связанные документы

- [RESEMBLE_TTS_USAGE.md](./RESEMBLE_TTS_USAGE.md) - Документация по useResembleTTS
- [DICTIONARY_MANAGEMENT.md](./DICTIONARY_MANAGEMENT.md) - Управление словарем
- [new-dictionary-structure.md](./new-dictionary-structure.md) - Структура данных словаря
- [SUPABASE_CRUD_USAGE.md](./SUPABASE_CRUD_USAGE.md) - Работа с Supabase
