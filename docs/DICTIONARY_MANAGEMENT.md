# Управление словарем (Dictionary Management)

## Обзор

Система управления словарем работает с таблицей `new_dictionar` в Supabase. Каждая строка хранит полноформатную структуру `DictionaryEntry`, описанную в `docs/new-dictionary-structure.md`, включая варианты переводов, примеры и медиа. Компоненты Nuxt используют эту таблицу для отображения карточек слов, интерактивного редактирования и синхронизации данных между фронтендом и БД.

### Мультиязычность

Система автоматически определяет язык отображения переводов на основе текущей локали пользователя (i18n):
- **Русская локаль** (`ru`, `ru-RU`) → показываются переводы на русском языке
- **Английская локаль** (`en`, `en-US`, `en-GB`) → показываются переводы на английском языке  
- **Тайская локаль** (`th`, `th-TH`) → переводы на английском языке (по умолчанию)

**Если перевод на выбранном языке отсутствует**, отображается сообщение из i18n: `dictionary.noTranslationAvailable` ("Перевод на выбранном языке недоступен").

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

### Доступ через RLS

- Для публичного чтения включена политика `Allow anon read new_dictionar`, разрешающая ролям `anon` и `authenticated` выполнять `SELECT` без ограничений (`USING (true)`).
- При обновлении политик нужно перепроверять REST-запрос `headword->>script`, чтобы убедиться в доступности данных для фронтенда.
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
- Динамическое определение языка отображения переводов

**Состояния компонента**:
```typescript
- isOpen: boolean          // Открыт ли попап
- state: 'idle' | 'loading' | 'loaded' | 'not-found' | 'error'
- entry: DictionaryEntry | null  // Загруженные данные слова
- isAddDialogOpen: boolean // Открыт ли диалог добавления/редактирования
- editId: string | null    // ID записи для редактирования (entry_id)
- dictionaryLanguage: 'ru' | 'en' // Текущий язык переводов
```

**Определение языка переводов**:
```typescript
import { getDictionaryLanguage } from '../../../utils/language-mapping';

const { t, locale } = useI18n();

const dictionaryLanguage = computed<'ru' | 'en'>(() => {
  return getDictionaryLanguage(locale.value);
});
```

### 2. AddWordDialog.vue

**Расположение**: `app/components/ui/AddWordDialog.vue`

**Назначение**: Универсальный диалог для добавления новых слов и редактирования существующих.

**Props**:
```typescript
{
  isOpen: boolean;      // Открыт ли диалог
  word?: string;        // Слово для предзаполнения (при добавлении)
  editId?: string | number | null; // ID записи для редактирования (entry_id для новой структуры)
}
```

**Определение языка переводов**:
```typescript
const { t, locale } = useI18n();

const dictionaryLanguage = computed<'ru' | 'en'>(() => {
  return getDictionaryLanguage(locale.value);
});
```

При сохранении слова используется текущий язык локали для создания переводов.

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

**Запрос к Supabase**:
```typescript
// Создание payload с учетом текущего языка
const newPayload = {
  entry_id: entryId,
  headword: {
    script: form.value.word_th.trim(),
    romanization: form.value.transcription_en
      ? { paiboon: form.value.transcription_en.trim() }
      : undefined,
  },
  senses: [
    {
      senseId,
      definition: {
        [dictionaryLanguage.value]: translations[0] || '', // Динамический язык
      },
      translations: [
        {
          language: dictionaryLanguage.value, // Используется текущая локаль
          variants: translations.map((text: string) => ({ text, register: 'neutral' })),
        },
      ],
      examples: Array.isArray(examples) ? examples : [],
    },
  ],
  // ...
};

if (props.editId) {
  const result = await client.from('new_dictionar').update(newPayload).eq('entry_id', props.editId);
  saveError = result.error;
} else {
  const result = await client.from('new_dictionar').insert(newPayload);
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
    "saveError": "Ошибка при сохранении",
    "languageLabel": "Язык переводов",
    "noTranslationAvailable": "Перевод на выбранном языке недоступен",
    "fallbackLanguageUsed": "Показан перевод на английском языке",
    "showingEnglish": "Отображается на английском",
    "showingRussian": "Отображается на русском"
  }
}
```

### Динамическое определение языка переводов

**Маппинг локалей** (`utils/language-mapping.ts`):
```typescript
export const LOCALE_TO_DICTIONARY_LANG: Record<string, 'ru' | 'en'> = {
  ru: 'ru',
  'ru-RU': 'ru',
  en: 'en',
  'en-US': 'en',
  'en-GB': 'en',
  th: 'en', // Fallback для тайского
  'th-TH': 'en',
};

export function getDictionaryLanguage(locale: string): 'ru' | 'en' {
  return LOCALE_TO_DICTIONARY_LANG[locale] || 'en';
}
```

**Использование в компонентах**:
```typescript
import { getDictionaryLanguage } from '../../utils/language-mapping';

const { locale } = useI18n();
const dictionaryLanguage = computed(() => getDictionaryLanguage(locale.value));

// При извлечении переводов
const translation = extractPrimaryTranslation(
  entry.senses,
  dictionaryLanguage.value, // Динамический язык
  true // Включить fallback
);
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

## Мультиязычная поддержка переводов

### Автоматический выбор языка

Компоненты автоматически определяют язык отображения на основе текущей локали:

```typescript
// VocabularyWordCard.vue
const dictionaryLanguage = computed<'ru' | 'en'>(() => {
  return getDictionaryLanguage(locale.value);
});

const wordTranslations = computed(() => {
  if (isNewStructure.value) {
    const translations = getAllTranslations(
      (props.word as DictionaryEntry).senses,
      dictionaryLanguage.value, // Используется текущая локаль
      false // Fallback отключен - показываем сообщение если нет перевода
    );
    return translations.length > 0 ? translations : [t('dictionary.noTranslationAvailable')];
  }
  return (props.word as LegacyWordData).translation || [];
});
```

### Обработка отсутствующих переводов

Если перевод на запрошенном языке отсутствует, система отображает локализованное сообщение:

```typescript
// VocabularyWordCard.vue
const wordPrimaryTranslation = computed(() => {
  if (isNewStructure.value) {
    const translation = extractPrimaryTranslation(
      (props.word as DictionaryEntry).senses,
      dictionaryLanguage.value,
      false // fallback отключен
    );
    // Если перевода нет, показываем сообщение
    return translation || t('dictionary.noTranslationAvailable');
  }
  return getPrimaryTranslation((props.word as LegacyWordData).translation);
});

const wordTranslations = computed(() => {
  if (isNewStructure.value) {
    const translations = getAllTranslations(
      (props.word as DictionaryEntry).senses,
      dictionaryLanguage.value,
      false // fallback отключен
    );
    // Если переводов нет, возвращаем массив с сообщением
    return translations.length > 0 ? translations : [t('dictionary.noTranslationAvailable')];
  }
  return (props.word as LegacyWordData).translation || [];
});
```

**Локализованные сообщения**:
- **Русский**: "Перевод на выбранном языке недоступен"
- **Английский**: "Translation not available in selected language"

### Сохранение слов с учетом языка

При добавлении/редактировании слова переводы сохраняются на языке текущей локали:

```typescript
// AddWordDialog.vue
const newPayload = {
  senses: [
    {
      definition: {
        [dictionaryLanguage.value]: translations[0] || '',
      },
      translations: [
        {
          language: dictionaryLanguage.value,
          variants: translations.map((text) => ({ text, register: 'neutral' })),
        },
      ],
    },
  ],
};
```

**Пример**:
- Пользователь с локалью `ru` добавляет слово → сохраняется перевод на русском
- Пользователь с локалью `en` добавляет слово → сохраняется перевод на английском
- При просмотре:
  - Если есть перевод на языке пользователя → отображается перевод
  - Если нет перевода на языке пользователя → отображается "Перевод на выбранном языке недоступен"
  - Пользователь может отредактировать слово и добавить перевод на своем языке

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
9. **Индикатор языка**: Отображение флага текущего языка переводов
10. **Ручной выбор языка**: Переопределение автоматического выбора пользователем

## Заключение

Система управления словарем предоставляет полный цикл CRUD операций для таблицы `dictionary`, интегрированный в пользовательский интерфейс через интерактивные слова. Использование Supabase MCP обеспечивает типобезопасность и удобную работу с базой данных.
