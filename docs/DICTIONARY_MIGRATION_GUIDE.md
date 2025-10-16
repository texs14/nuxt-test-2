# Руководство по миграции словаря

## Обзор

Этот документ описывает процесс миграции с таблицы `dictionary` на новую таблицу `new_dictionar` с улучшенной структурой данных.

## Что изменилось

### Старая структура (`dictionary`)
```typescript
{
  id: number;
  word_th: string;
  translation: string[];
  transcription_en: string | null;
  synonyms: string[] | null;
  antonyms: string[] | null;
  examples: Json[] | null;
  links: string[] | null;
}
```

### Новая структура (`new_dictionar`)
```typescript
{
  entry_id: string;
  headword: {
    script: string;
    romanization?: { paiboon?: string; ipa?: string };
    audio?: MediaAsset[];
    partOfSpeech?: string;
    morphology?: { syllableCount?: number; tone?: string };
  };
  metadata?: {
    frequency?: Record<string, number>;
    topics?: string[];
    sources?: string[];
  };
  senses: [{
    senseId: string;
    definition: Record<string, string>;
    usageLabels?: string[];
    translations: [{
      language: 'en' | 'ru';
      variants: [{ text: string; register?: string; frequency?: number }];
    }];
    examples?: ExampleItem[];
  }];
  related?: {
    homophones?: RelatedEntry[];
    compounds?: RelatedEntry[];
  };
}
```

## Преимущества новой структуры

1. **Множественные значения**: Одно слово может иметь несколько `senses` с разными определениями
2. **Детализированные переводы**: Варианты с частотностью и регистром
3. **Метаданные**: Темы, частоты использования, источники
4. **Медиа**: Поддержка аудио и видео
5. **Связи**: Омонимы и составные слова
6. **Международность**: Определения на разных языках

## Этапы миграции

### 1. Подготовка БД

Выполните миграцию SQL:
```bash
# Применить миграцию в Supabase
supabase db push
```

Или вручную выполните файл:
```
supabase/migrations/2025-10-13_new_dictionary_structure.sql
```

### 2. Миграция данных

#### Вариант A: Python скрипт

```bash
# Установите зависимости
pip install supabase

# Установите переменные окружения
export SUPABASE_URL="your-project-url"
export SUPABASE_SERVICE_KEY="your-service-key"

# Запустите миграцию
python scripts/migrate_dictionary_to_new.py
```

#### Вариант B: SQL скрипт

```sql
-- Пример ручной миграции одной записи
INSERT INTO new_dictionar (entry_id, headword, metadata, senses, related)
SELECT 
  word_th as entry_id,
  jsonb_build_object(
    'script', word_th,
    'romanization', jsonb_build_object('paiboon', transcription_en)
  ) as headword,
  jsonb_build_object(
    'sources', links,
    'createdAt', created_at
  ) as metadata,
  jsonb_build_array(
    jsonb_build_object(
      'senseId', word_th || '-sense-1',
      'definition', jsonb_build_object('ru', translation[1]),
      'translations', jsonb_build_array(
        jsonb_build_object(
          'language', 'ru',
          'variants', (
            SELECT jsonb_agg(jsonb_build_object('text', t, 'register', 'neutral'))
            FROM unnest(translation) t
          )
        )
      ),
      'examples', examples
    )
  ) as senses,
  '{}'::jsonb as related
FROM dictionary
WHERE word_th = 'สวัสดี';
```

### 3. Обновление компонентов

Компоненты уже поддерживают обе структуры:

- `InteractiveWord.vue` - автоматически определяет структуру
- `VocabularyWordCard.vue` - адаптируется к типу данных
- `AddWordDialog.vue` - сохраняет в новую таблицу

### 4. Переключение Feature Flag

В `InteractiveWord.vue` установлен флаг:
```typescript
const USE_NEW_DICTIONARY = ref(true); // true = новая таблица
```

Когда готовы к переключению:
1. Убедитесь, что все данные мигрированы
2. Протестируйте на staging
3. Включите флаг в production
4. Мониторьте ошибки

### 5. Проверка миграции

```sql
-- Проверить количество записей
SELECT 
  (SELECT COUNT(*) FROM dictionary) as old_count,
  (SELECT COUNT(*) FROM new_dictionar) as new_count;

-- Найти отсутствующие записи
SELECT word_th 
FROM dictionary 
WHERE word_th NOT IN (
  SELECT headword->>'script' FROM new_dictionar
);

-- Сравнить конкретное слово
SELECT 
  d.word_th,
  d.translation,
  nd.headword->>'script' as new_script,
  nd.senses
FROM dictionary d
LEFT JOIN new_dictionar nd ON d.word_th = nd.headword->>'script'
WHERE d.word_th = 'สวัสดี';
```

## API изменения

### Vocabulary API

Обновлены endpoints для работы с `entry_id` вместо `id`:

**Было:**
```typescript
GET  /api/vocabulary/check?dictionary_id=123
POST /api/vocabulary { dictionary_id: 123 }
DELETE /api/vocabulary/123
```

**Стало:**
```typescript
GET  /api/vocabulary/check?entry_id=สวัสดี
POST /api/vocabulary { entry_id: 'สวัสดี' }
DELETE /api/vocabulary/สวัสดี
```

## Откат миграции

Если нужно вернуться к старой структуре:

1. Установите `USE_NEW_DICTIONARY = false`
2. Данные в старой таблице остаются нетронутыми
3. При необходимости восстановите из бэкапа

```sql
-- Бэкап старой таблицы
CREATE TABLE dictionary_backup AS SELECT * FROM dictionary;

-- Восстановление
TRUNCATE dictionary;
INSERT INTO dictionary SELECT * FROM dictionary_backup;
```

## Обратная совместимость

Система поддерживает одновременную работу с обеими таблицами:

```typescript
// Компонент автоматически определяет структуру
if ('entryId' in word && 'headword' in word) {
  // Новая структура
} else {
  // Старая структура
}
```

## Производительность

### Индексы

Новая таблица имеет оптимизированные индексы:
- `GIN` на `headword->script` для быстрого поиска
- `GIN` на `metadata->topics` для фильтрации по темам
- `GIN` на `senses` для поиска по значениям

### Кэширование

Кэш остается совместимым:
```typescript
type DictionaryCacheState = Record<string, DictionaryEntry | null>;
// Ключ: normalized word (script)
// Значение: новая структура DictionaryEntry
```

## Часто задаваемые вопросы

### Q: Можно ли использовать обе таблицы одновременно?
A: Да, компоненты поддерживают fallback на старую таблицу если запись не найдена в новой.

### Q: Что происходит с vocabulary пользователей?
A: Необходимо обновить `user_vocabulary` таблицу, заменив `dictionary_id` (number) на `entry_id` (text).

### Q: Потеряются ли старые данные?
A: Нет, старая таблица `dictionary` остается нетронутой. Миграция только копирует данные.

### Q: Как обрабатываются антонимы?
A: В новой структуре антонимы не поддерживаются напрямую. Их можно добавить в `notes` примеров или создать отдельные связи через `related`.

### Q: Нужно ли менять существующие компоненты?
A: Нет, все компоненты обновлены для автоматической поддержки обеих структур.

## Поддержка

При возникновении проблем:
1. Проверьте логи Supabase
2. Убедитесь, что миграция SQL выполнена
3. Проверьте переменные окружения для Python скрипта
4. Откройте issue в репозитории

## Следующие шаги

После успешной миграции:

1. Мониторинг производительности (3-7 дней)
2. Сбор обратной связи от пользователей
3. Удаление старой таблицы (через 1-2 месяца)
4. Оптимизация индексов на основе реального использования
5. Расширение функциональности (аудио, видео, темы)
