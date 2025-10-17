# AI-генерация словарных записей

## Описание

Система автоматической генерации словарных записей для тайских слов с использованием Google Gemini и синтеза аудио через Resemble AI.

## Возможности

- ✅ Автоматическая генерация полных словарных записей через Google Gemini
- ✅ Переводы на русский и английский языки
- ✅ IPA и Paiboon транскрипция
- ✅ Примеры использования с переводами
- ✅ Синонимы и составные слова
- ✅ Автоматический синтез аудио произношения
- ✅ Валидация сгенерированных данных
- ✅ Обработка ошибок и retry механизм
- ✅ UI с прогресс индикатором

## Архитектура

### Файлы

**Composables:**
- `app/composables/useGemini.ts` - базовый composable для работы с Google Gemini API
- `app/composables/useDictionaryAI.ts` - генерация словарных записей через Gemini

**Server API Endpoints:**
- `server/api/gemini/chat.post.ts` - прокси для Google Gemini API
- `server/api/dictionary/generate.post.ts` - генерация и сохранение словарных записей
- `server/api/dictionary/synthesize-audio.post.ts` - синтез аудио для словарных записей

**UI Components:**
- `app/components/ui/GenerationProgress.vue` - компонент прогресса генерации
- `app/components/InteractiveWord.vue` - модифицирован для вызова генерации

## Настройка

### 1. Переменные окружения

Создайте файл `.env` на основе `.env.example`:

```bash
# Google Gemini
GEMINI_KEY=your-gemini-api-key

# Resemble AI
RESEMBLE_KEY=your-resemble-api-key

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 2. Права доступа

Для генерации словарных записей пользователь должен иметь роль **moderator** или **admin** в таблице `profiles`.

```sql
UPDATE profiles
SET role = 'moderator'
WHERE id = 'user-id';
```

### 3. Структура базы данных

Убедитесь, что таблица `new_dictionar` существует со следующей структурой:

```sql
CREATE TABLE new_dictionar (
  entry_id TEXT PRIMARY KEY,
  headword JSONB NOT NULL,
  metadata JSONB,
  senses JSONB NOT NULL,
  related JSONB,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);
```

## Использование

### Для пользователя

1. Откройте любую страницу с тайским текстом (например, видео с субтитрами)
2. Кликните на слово, которого нет в словаре
3. В popup появится сообщение "Слово не найдено" и кнопка "Добавить слово"
4. Нажмите кнопку - система автоматически:
   - Сгенерирует полную словарную запись через GPT-4
   - Синтезирует аудио произношения
   - Сохранит в базу данных
5. После завершения popup автоматически обновится с новыми данными

### Программное использование

```typescript
// Использование composable напрямую
const { generateEntry, isGenerating, generationError } = useDictionaryAI();

const entry = await generateEntry('สวัสดี');
if (entry) {
  console.log('Сгенерировано:', entry);
}
```

```typescript
// Вызов через API
const response = await $fetch('/api/dictionary/generate', {
  method: 'POST',
  body: {
    word: 'สวัสดี',
  },
});

if (response.success) {
  console.log('Запись создана:', response.entry);
}
```

## Процесс генерации

### Этапы

1. **Generating (🤖)** - Генерация перевода и примеров через Gemini
   - Создание системного промпта с детальной структурой
   - Отправка запроса к Gemini
   - Парсинг JSON ответа
   - Валидация структуры данных

2. **Saving (💾)** - Сохранение в базу данных
   - Проверка существования слова
   - Сохранение записи в таблицу `new_dictionar`

3. **Synthesizing (🎤)** - Синтез аудио (в фоновом режиме)
   - Синтез произношения через Resemble AI
   - Конвертация в base64
   - Обновление записи с аудио

4. **Done (✅)** - Готово
   - Обновление кэша
   - Автоматическое обновление UI

### Обработка ошибок

Система обрабатывает следующие ошибки:

- **401** - Требуется авторизация
- **403** - Недостаточно прав (требуется роль модератора)
- **409** - Слово уже существует в словаре
- **429** - Превышен лимит запросов к Gemini
- **500** - Ошибка генерации/синтеза/сохранения

При ошибке пользователь может нажать кнопку "Попробовать снова".

## Структура сгенерированной записи

Пример сгенерированной записи:

```json
{
  "entryId": "sawatdii",
  "headword": {
    "script": "สวัสดี",
    "romanization": {
      "paiboon": "sà-wàt-dii",
      "ipa": "sàwàtdīː"
    },
    "partOfSpeech": "interjection",
    "morphology": {
      "syllableCount": 3,
      "tone": "falling-low-rising"
    }
  },
  "metadata": {
    "frequency": {
      "spoken": 5,
      "written": 5
    },
    "topics": ["greetings", "social"],
    "sources": ["Thai National Corpus 2024"]
  },
  "senses": [
    {
      "senseId": "sawatdii-greeting",
      "definition": {
        "th": "คำทักทายที่ใช้ในการพบกันและการจากกัน",
        "en": "greeting used when meeting or parting",
        "ru": "приветствие при встрече или прощании"
      },
      "translations": [
        {
          "language": "en",
          "variants": [
            { "text": "hello", "register": "neutral", "frequency": 5 },
            { "text": "hi", "register": "neutral", "frequency": 4 }
          ]
        },
        {
          "language": "ru",
          "variants": [
            { "text": "привет", "register": "нейтр.", "frequency": 5 },
            { "text": "здравствуйте", "register": "нейтр.", "frequency": 5 }
          ]
        }
      ],
      "examples": [
        {
          "exampleId": "sawatdii-ex1",
          "sentence": {
            "th": "สวัสดีครับ",
            "en": "Hello (said by male)",
            "ru": "Здравствуйте (говорит мужчина)"
          }
        }
      ]
    }
  ]
}
```

## Ограничения

1. **Rate Limits** - Gemini API имеет ограничения на количество запросов
2. **Стоимость** - Каждая генерация использует токены Gemini (значительно дешевле чем GPT-4)
3. **Точность** - Gemini может ошибаться, рекомендуется проверка сгенерированных данных
4. **Синтез аудио** - Требует настройки Resemble AI voice UUID для тайского языка

## Мониторинг и отладка

### Логи сервера

```bash
# Просмотр логов генерации
tail -f .output/server/logs/dictionary-generate.log
```

### Проверка записей в БД

```sql
-- Последние сгенерированные записи
SELECT entry_id, headword->>'script' as word, created_at
FROM new_dictionar
ORDER BY created_at DESC
LIMIT 10;

-- Записи с аудио
SELECT entry_id, 
       headword->>'script' as word,
       jsonb_array_length(headword->'audio') as audio_count
FROM new_dictionar
WHERE headword->'audio' IS NOT NULL;
```

## Будущие улучшения

- [ ] Кэширование промптов для уменьшения токенов
- [ ] Batch генерация нескольких слов
- [ ] Человеческая модерация сгенерированных записей
- [ ] Статистика качества генерации
- [ ] A/B тестирование разных промптов
- [ ] Интеграция с другими TTS провайдерами
- [ ] Поддержка других моделей (Gemini Pro, Claude)
