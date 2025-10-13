# Управление словарем (Dictionary Management)

## Обзор

Система управления словарем работает с таблицей `new_dictionar` в Supabase. Каждая строка хранит полноформатную структуру `DictionaryEntry`, описанную в `docs/new-dictionary-structure.md`, включая варианты переводов, примеры и медиа. Компоненты Nuxt используют эту таблицу для отображения карточек слов, интерактивного редактирования и синхронизации данных между фронтендом и БД.

## Структура таблицы `new_dictionar`

Таблица содержит следующие поля:

| Поле | Тип | Обязательное | Описание |
|------|-----|--------------|----------|
| `entry_id` | text | Да | Уникальный идентификатор записи (соответствует `entryId`). |
| `headword` | jsonb | Да | Объект `Headword` с написанием, фонетикой и аудио. |
| `metadata` | jsonb | Нет | Объект `Metadata` с частотами, темами и источниками. |
| `senses` | jsonb | Да | Массив `Sense[]` с переводами, примерами и медиа. |
| `related` | jsonb | Нет | Ссылки на родственные записи (омонимы, составные слова). |
| `created_at` | timestamptz | Нет | Время создания (UTC, по умолчанию `timezone('utc', now())`). |
| `updated_at` | timestamptz | Нет | Время последнего изменения (UTC, обновляется триггером). |

> Полные определения типов `Headword`, `Sense`, `TranslationBlock` и др. приведены в `docs/new-dictionary-structure.md`.

### Индексы и триггеры

- **GIN индексы**: `new_dictionar_headword_gin`, `new_dictionar_topics_gin`, `new_dictionar_sense_ids_gin` обеспечивают быстрый поиск по написанию, темам и идентификаторам значений.
- **Триггер `set_new_dictionar_updated_at`**: вызывает функцию `trigger_set_timestamp()` перед `UPDATE`, чтобы автоматически обновлять `updated_at`.
- **Поиск по ключам**: для прямого доступа используется `entry_id`, для поиска по написанию — выражение `headword->>script`.

## Архитектура компонентов

### 1. InteractiveWord.vue

**Расположение**: `app/components/ui/InteractiveWord.vue`

**Назначение**: Основной компонент для отображения интерактивных слов и управления словарем.

**Основные функции**:
- Отображение кликабельного слова
- Загрузка и кэширование данных из словаря
- Показ попапа с переводом и дополнительной информацией
- Открытие диалогов добавления/редактирования

**Состояния компонента**:
```typescript
- isOpen: boolean          // Открыт ли попап
- state: 'idle' | 'loading' | 'loaded' | 'not-found' | 'error'
- entry: DictionaryEntry | null  // Загруженные данные слова
- isAddDialogOpen: boolean // Открыт ли диалог добавления/редактирования
- editId: number | null    // ID записи для редактирования
```

### 2. AddWordDialog.vue

**Расположение**: `app/components/ui/AddWordDialog.vue`

**Назначение**: Универсальный диалог для добавления новых слов и редактирования существующих.

**Props**:
```typescript
{
  isOpen: boolean;      // Открыт ли диалог
  word?: string;        // Слово для предзаполнения (при добавлении)
  editId?: number | null; // ID записи для редактирования
}
```

**Режимы работы**:
1. **Добавление** (`editId = null`): Создание новой записи в словаре
2. **Редактирование** (`editId !== null`): Обновление существующей записи

## Сценарий 1: Добавление нового слова

### Шаг 1: Инициация добавления

**Триггер**: Пользователь кликает на слово, которого нет в словаре

**Действия**:
1. `InteractiveWord` выполняет поиск слова в таблице `dictionary`
2. Результат не найден → отображается состояние `not-found`
3. Показывается сообщение "Слово не найдено" и кнопка "Добавить слово"

**Код**:
```typescript
// InteractiveWord.vue (строки ~250-270)
const { data, error } = await client
  .from('dictionary')
  .select('*')
  .eq('word_th', normalizedWord)
  .order('created_at', { ascending: false });

if (!rows.length) {
  cache.value[normalizedWord] = null;
  entry.value = null;
  state.value = 'not-found';
}
```

### Шаг 2: Открытие формы добавления

**Триггер**: Клик на кнопку "Добавить слово"

**Действия**:
1. Вызывается `onOpenAddDialog()`
2. Устанавливается `editId = null` (режим добавления)
3. Устанавливается `isAddDialogOpen = true`
4. Открывается `AddWordDialog` с предзаполненным полем `word_th`

**Код**:
```typescript
// InteractiveWord.vue (строки ~383-386)
const onOpenAddDialog = () => {
  editId.value = null;
  isAddDialogOpen.value = true;
};
```

### Шаг 3: Заполнение формы

**Действия в AddWordDialog**:
1. При открытии вызывается `resetForm()` (так как `editId = null`)
2. Поле `word_th` предзаполняется из props
3. Пользователь заполняет обязательные поля:
   - `word_th` (тайское слово)
   - `translation` (переводы через запятую)
4. Опционально заполняет:
   - `transcription_en` (транскрипция)
   - `synonyms` (синонимы через запятую)
   - `antonyms` (антонимы через запятую)
   - `links` (ссылки через запятую)
   - `examples` (JSON массив примеров)

**Код**:
```typescript
// AddWordDialog.vue (строки ~233-243)
watch(
  () => props.isOpen,
  async (value) => {
    if (value) {
      if (props.editId) {
        await loadWordData();
      } else {
        resetForm(); // Режим добавления
      }
    }
  }
);
```

### Шаг 4: Сохранение нового слова

**Триггер**: Клик на кнопку "Сохранить"

**Обработка данных**:
1. Строки с запятыми преобразуются в массивы через `parseArray()`
2. JSON примеров парсится через `parseExamples()`
3. Формируется payload с типизированными данными

**Запрос к Supabase** (через MCP):
```typescript
// AddWordDialog.vue (строки ~298-304)
if (props.editId) {
  const result = await client.from('dictionary').update(payload).eq('id', props.editId);
  saveError = result.error;
} else {
  const result = await client.from('dictionary').insert(payload); // INSERT
  saveError = result.error;
}
```

**После успешного сохранения**:
1. Генерируется событие `saved`
2. Закрывается диалог
3. В `InteractiveWord` вызывается `onWordSaved()`

### Шаг 5: Обновление кэша и отображения

**Действия**:
1. Удаляется запись из кэша для текущего слова
2. Закрывается попап слова
3. Автоматически открывается попап снова с загрузкой свежих данных

**Код**:
```typescript
// InteractiveWord.vue (строки ~400-409)
const onWordSaved = async () => {
  const normalizedWord = props.word.trim();
  delete cache.value[normalizedWord]; // Очистка кэша
  
  isAddDialogOpen.value = false;
  closePopup();
  
  await nextTick();
  await onToggle(); // Повторное открытие с загрузкой
};
```

## Сценарий 2: Редактирование существующего слова

### Шаг 1: Открытие слова с переводом

**Триггер**: Пользователь кликает на слово, которое есть в словаре

**Действия**:
1. Загружаются данные слова из `dictionary`
2. Если найдено несколько записей, они агрегируются
3. Отображается попап с переводом и кнопкой "Редактировать"

### Шаг 2: Инициация редактирования

**Триггер**: Клик на кнопку "Редактировать"

**Действия**:
1. Вызывается `onOpenEditDialog()`
2. Извлекается `entry.value.id` и устанавливается в `editId`
3. Открывается `AddWordDialog` в режиме редактирования

**Код**:
```typescript
// InteractiveWord.vue (строки ~388-393)
const onOpenEditDialog = () => {
  if (entry.value?.id) {
    editId.value = entry.value.id;
    isAddDialogOpen.value = true;
  }
};
```

### Шаг 3: Загрузка данных для редактирования

**В AddWordDialog**:
1. Срабатывает watch на `props.isOpen` с условием `props.editId !== null`
2. Вызывается `loadWordData()`

**Процесс загрузки**:
```typescript
// AddWordDialog.vue (строки ~200-231)
const loadWordData = async () => {
  if (!props.editId) return;

  isLoading.value = true;
  error.value = '';

  try {
    const { data, error: loadError } = await client
      .from('dictionary')
      .select('*')
      .eq('id', props.editId)
      .single(); // Получение одной записи

    if (loadError) throw loadError;

    if (data) {
      // Форматирование данных для формы
      form.value = {
        word_th: data.word_th || '',
        translation: formatArrayToString(data.translation),      // Массив → строка
        transcription_en: data.transcription_en || '',
        synonyms: formatArrayToString(data.synonyms),
        antonyms: formatArrayToString(data.antonyms),
        links: formatArrayToString(data.links),
        examples: formatExamplesToString(data.examples),         // JSON → строка
      };
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('dictionary.error');
  } finally {
    isLoading.value = false;
  }
};
```

**Вспомогательные функции**:
```typescript
// Преобразование массива в строку с запятыми
const formatArrayToString = (arr: string[] | null | undefined): string => {
  return Array.isArray(arr) ? arr.join(', ') : '';
};

// Преобразование JSON в форматированную строку
const formatExamplesToString = (examples: unknown): string => {
  if (!examples) return '';
  try {
    return JSON.stringify(examples, null, 2);
  } catch {
    return '';
  }
};
```

### Шаг 4: Редактирование данных

**Пользователь**:
- Видит форму с предзаполненными данными
- Может изменить любые поля
- Заголовок диалога: "Редактирование слова"

### Шаг 5: Сохранение изменений

**Триггер**: Клик на кнопку "Сохранить"

**Запрос к Supabase**:
```typescript
// AddWordDialog.vue (строки ~298-300)
if (props.editId) {
  const result = await client.from('dictionary').update(payload).eq('id', props.editId);
  saveError = result.error;
}
```

**Отличие от добавления**: Используется `UPDATE` вместо `INSERT`, с условием `WHERE id = editId`

### Шаг 6: Обновление отображения

Аналогично сценарию добавления:
1. Очистка кэша
2. Закрытие попапа
3. Повторное открытие с актуальными данными

## Интеграция с Supabase через MCP

### Используемые MCP функции

**1. Чтение данных**:
```typescript
await client
  .from('dictionary')
  .select('*')
  .eq('word_th', word)
  .single();
```

**2. Вставка новой записи**:
```typescript
await client
  .from('dictionary')
  .insert({
    word_th: string,
    translation: string[],
    transcription_en: string | null,
    synonyms: string[],
    antonyms: string[],
    links: string[],
    examples: jsonb,
  });
```

**3. Обновление существующей записи**:
```typescript
await client
  .from('dictionary')
  .update(payload)
  .eq('id', editId);
```

### Обработка ошибок

```typescript
try {
  // Операция с БД
  if (saveError) throw saveError;
  
  emit('saved');
  emit('close');
} catch (err) {
  error.value = err instanceof Error ? err.message : t('dictionary.saveError');
} finally {
  isSaving.value = false;
}
```

## Кэширование

### Структура кэша

```typescript
type DictionaryCacheState = Record<string, DictionaryEntry | null>;

const cache = useState<DictionaryCacheState>('dictionary-cache', () => ({}));
```

### Логика кэширования

1. **Проверка кэша**: Перед запросом к БД проверяется наличие слова в кэше
2. **Сохранение в кэш**: После загрузки данные сохраняются
3. **Очистка кэша**: После добавления/редактирования кэш для слова удаляется
4. **Кэширование null**: Отсутствующие слова также кэшируются (`null`)

```typescript
// InteractiveWord.vue
const cached = cache.value[normalizedWord];
if (cached !== undefined) {
  entry.value = cached;
  state.value = cached ? 'loaded' : 'not-found';
  return;
}

// После загрузки
cache.value[normalizedWord] = aggregated;

// После сохранения
delete cache.value[normalizedWord];
```

## Локализация

### Ключи переводов

**Русский** (`locales/ru.json`):
```json
{
  "dictionary": {
    "empty": "Слово не найдено",
    "loading": "Загрузка...",
    "error": "Ошибка загрузки",
    "translation": "Перевод",
    "synonyms": "Синонимы",
    "antonyms": "Антонимы",
    "examples": "Примеры",
    "links": "Ссылки",
    "addWord": "Добавить слово",
    "editWord": "Редактировать",
    "addWordForm": "Добавление слова в словарь",
    "editWordForm": "Редактирование слова",
    "save": "Сохранить",
    "cancel": "Отмена",
    "saving": "Сохранение...",
    "saved": "Слово успешно добавлено",
    "saveError": "Ошибка при сохранении"
  }
}
```

## Валидация данных

### Обязательные поля

- `word_th`: HTML атрибут `required`
- `translation`: HTML атрибут `required`

### Парсинг данных

**Массивы** (разделенные запятыми):
```typescript
const parseArray = (value: string): string[] => {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean); // Удаление пустых элементов
};
```

**JSON примеров**:
```typescript
const parseExamples = (value: string): unknown => {
  if (!value.trim()) return [];
  try {
    return JSON.parse(value);
  } catch {
    return []; // Возврат пустого массива при ошибке
  }
};
```

## Агрегация записей

Если для одного слова существует несколько записей в БД, они объединяются:

```typescript
// InteractiveWord.vue (строки ~280-308)
const translations = mergeStringArrays(normalizedRows.map((row) => row.translation));
const synonyms = mergeStringArrays(normalizedRows.map((row) => row.synonyms));
const links = mergeStringArrays(normalizedRows.map((row) => row.links));
const antonyms = mergeStringArrays(normalizedRows.map((row) => row.antonyms));
const examples = mergeExampleArrays(normalizedRows.map((row) => row.examples));

const aggregated: DictionaryEntry = {
  ...base,
  translation: translations.length ? translations : base.translation,
  synonyms: synonyms.length ? synonyms : base.synonyms,
  // ...
};
```

### Функции слияния

```typescript
const mergeStringArrays = (sources: (string[] | null | undefined)[]) => {
  const unique = new Set<string>();
  sources.forEach((list) => {
    if (!Array.isArray(list)) return;
    list.forEach((value) => {
      if (typeof value === 'string' && value.trim().length) {
        unique.add(value);
      }
    });
  });
  return Array.from(unique);
};
```

## UI компоненты

### Попап слова (InteractiveWord)

**Состояния отображения**:
1. **loading**: Спиннер загрузки
2. **loaded**: Полная информация о слове + кнопка "Редактировать"
3. **not-found**: Сообщение + кнопка "Добавить слово"
4. **error**: Сообщение об ошибке

### Диалог управления (AddWordDialog)

**Структура**:
- Header: Заголовок (динамический) + кнопка закрытия
- Form: Поля ввода
- Actions: Кнопки "Отмена" и "Сохранить"

**Disabled состояние**: Все поля и кнопки блокируются при `isSaving = true`

## Типизация

```typescript
interface DictionaryExample {
  th?: string;
  ru?: string;
  en?: string;
  [key: string]: Json | undefined;
}

type DictionaryRow = Database['public']['Tables']['dictionary']['Row'];

type DictionaryEntry = Omit<DictionaryRow, 'examples'> & { 
  examples: DictionaryExample[] | null 
};
```

## Workflow диаграмма

```
Клик на слово
    ↓
Поиск в кэше
    ↓
├─ Найдено → Показ попапа → [Кнопка "Редактировать"]
│                                ↓
│                           LoadWordData()
│                                ↓
│                           Форма с данными
│                                ↓
│                           UPDATE запрос
│                                ↓
│                           Очистка кэша
│                                ↓
└─ Не найдено → Показ "Добавить слово" → [Кнопка "Добавить"]
                                              ↓
                                         Пустая форма
                                              ↓
                                         INSERT запрос
                                              ↓
                                         Очистка кэша
                                              ↓
                                    Повторная загрузка попапа
```

## Особенности реализации

### 1. Синхронизация состояния

- Используется глобальный state для кэша через `useState`
- Один instance диалога на весь компонент
- `editId` переключает режим работы диалога

### 2. Автоматическое обновление

После сохранения:
1. Кэш очищается
2. Попап закрывается
3. Автоматически открывается снова
4. Загружаются свежие данные

### 3. Предотвращение утечек памяти

```typescript
onBeforeUnmount(() => {
  if (!process.client) return;
  document.removeEventListener('click', onClickOutside);
  document.removeEventListener('keydown', onEscape);
});
```

### 4. Закрытие при клике вне попапа

```typescript
const onClickOutside = (event: MouseEvent) => {
  const target = event.target as Node | null;
  if (!isOpen.value) return;
  if (triggerRef.value?.contains(target) || popupRef.value?.contains(target)) return;
  closePopup();
};
```

## Расширение функционала

### Возможные улучшения

1. **Массовое редактирование**: Обновление нескольких записей одновременно
2. **История изменений**: Отслеживание версий записей
3. **Права доступа**: RLS политики для разных пользователей
4. **Автодополнение**: Подсказки при вводе синонимов/антонимов
5. **Импорт/Экспорт**: Загрузка словаря из файлов
6. **Поиск дубликатов**: Предупреждение при добавлении существующего слова
7. **Аудио произношение**: Добавление аудиофайлов
8. **Картинки**: Визуальные примеры использования

## Заключение

Система управления словарем предоставляет полный цикл CRUD операций для таблицы `dictionary`, интегрированный в пользовательский интерфейс через интерактивные слова. Использование Supabase MCP обеспечивает типобезопасность и удобную работу с базой данных.
