# Документация: Функционал перевода субтитров

## Обзор

Система автоматического перевода субтитров с тайского языка на русский и английский с использованием Google Gemini API. Реализована с соблюдением принципов DRY и SOLID.

## Архитектура

### Компоненты системы

```
┌─────────────────────────────────────────────────────────┐
│                   SubtitleEditor.vue                     │
│  ┌────────────────┐         ┌────────────────────────┐  │
│  │ TranslateButton│         │  TranslateButton       │  │
│  │ (для строки)   │         │  (массовый перевод)    │  │
│  └────────┬───────┘         └───────────┬────────────┘  │
│           │                             │               │
│           └─────────────┬───────────────┘               │
└─────────────────────────┼─────────────────────────────┘
                          │
                          ▼
            ┌─────────────────────────────┐
            │  useSubtitleTranslation()   │
            │  - translateSubtitle()      │
            │  - translateBatch()         │
            │  - Кеширование              │
            └──────────────┬──────────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │   useGemini()   │
                  │   - chat()      │
                  │   - chatJSON()  │
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │  Gemini API     │
                  └─────────────────┘
```

## Основные файлы

### 1. `app/composables/useSubtitleTranslation.ts`

Главный composable для работы с переводом субтитров.

#### Интерфейсы

```typescript
interface TranslationResult {
  ru: string;  // Русский перевод
  en: string;  // Английский перевод
}

interface SubtitleTranslationItem {
  id: string | number;  // ID субтитра
  th: string;           // Тайский текст
}

interface TranslationProgress {
  current: number;  // Текущий прогресс
  total: number;    // Всего субтитров
}
```

#### API

##### `translateSubtitle(thaiText: string): Promise<TranslationResult | null>`

Переводит один текст с тайского на русский и английский языки одним запросом к API.

**Параметры:**
- `thaiText` - тайский текст для перевода

**Возвращает:**
- `TranslationResult` - объект с переводами на русский и английский
- `null` - если произошла ошибка

**Особенности:**
- Использует кеш для повторных запросов
- Валидация входных данных
- Обработка ошибок API

**Пример использования:**
```typescript
const { translateSubtitle } = useSubtitleTranslation();

const result = await translateSubtitle('สวัสดีครับ');
// result = { ru: 'Здравствуйте', en: 'Hello' }
```

---

##### `translateBatch(subtitles: SubtitleTranslationItem[], onProgress?: Function): Promise<void>`

Переводит массив субтитров последовательно с отслеживанием прогресса.

**Параметры:**
- `subtitles` - массив объектов с ID и тайским текстом
- `onProgress` - callback-функция, вызываемая после каждого перевода

**Особенности:**
- Последовательное выполнение (избегает rate limiting)
- Задержка 500ms между запросами
- Обновление прогресса в реальном времени
- Использует кеш для оптимизации

**Пример использования:**
```typescript
const { translateBatch } = useSubtitleTranslation();

const subtitles = [
  { id: 1, th: 'สวัสดีครับ' },
  { id: 2, th: 'ขอบคุณครับ' }
];

await translateBatch(subtitles, (id, result) => {
  console.log(`Субтитр ${id} переведен:`, result);
  // Обновляем UI
});
```

---

##### `isTranslatingId(id: string | number): boolean`

Проверяет, переводится ли конкретный субтитр в данный момент.

**Использование:**
```typescript
const { isTranslatingId } = useSubtitleTranslation();

if (isTranslatingId(subtitleId)) {
  // Показать индикатор загрузки
}
```

---

#### Реактивные свойства

```typescript
const {
  isTranslating,          // Ref<boolean> - идёт ли массовый перевод
  translatingIds,         // Readonly<Ref<Set<string|number>>> - ID переводящихся субтитров
  translationProgress,    // Readonly<Ref<TranslationProgress|null>> - прогресс перевода
  error,                  // Readonly<Ref<string|null>> - ошибка перевода
  geminiLoading,          // Readonly<Ref<boolean>> - загрузка Gemini API
  geminiError,            // Readonly<Ref<string|null>> - ошибка Gemini API
} = useSubtitleTranslation();
```

---

### 2. `app/components/TranslateButton.vue`

Переиспользуемый компонент кнопки для перевода.

#### Props

```typescript
interface Props {
  loading?: boolean;      // Состояние загрузки
  disabled?: boolean;     // Кнопка отключена
  size?: 'small' | 'normal';  // Размер кнопки
  text?: string;          // Текст кнопки
  loadingText?: string;   // Текст при загрузке
}
```

#### Events

- `@click` - клик по кнопке (не срабатывает если disabled или loading)

#### Использование

```vue
<TranslateButton
  size="small"
  :loading="isTranslating"
  :disabled="!hasText"
  @click="handleTranslate"
>
  Перевести
</TranslateButton>
```

#### Стили

Кнопка использует BEM-методологию:
- `.translate-button` - базовый класс
- `.translate-button_size_small` - малый размер
- `.translate-button_size_normal` - обычный размер
- `.translate-button_loading` - состояние загрузки
- `.translate-button_disabled` - отключённое состояние

---

### 3. `app/components/SubtitleEditor.vue`

Редактор субтитров с интегрированным функционалом перевода.

#### Интеграция перевода

##### Кнопка перевода одной строки

Расположена внутри раскрывающейся секции RU/EN для каждого субтитра.

**Логика работы:**
1. Кнопка активна только если заполнено поле `text.th`
2. При клике вызывается `handleTranslateRow(idx)`
3. Показывает индикатор загрузки для конкретной строки
4. После перевода автоматически заполняет поля `text.ru` и `text.en`

```vue
<TranslateButton
  size="small"
  :loading="isTranslatingId(row.id ?? idx)"
  :disabled="!row.text?.th || isTranslating"
  @click="handleTranslateRow(idx)"
>
  {{ t('editor.translateRow') }}
</TranslateButton>
```

---

##### Кнопка массового перевода

Расположена в шапке редактора рядом с кнопкой "Добавить строку".

**Логика работы:**
1. Отображается только если есть хотя бы один субтитр с `text.th`
2. При клике переводит все субтитры последовательно
3. Показывает прогресс: "Переведено X из Y"
4. Блокирует все кнопки перевода во время работы

```vue
<TranslateButton
  v-if="canTranslateAll"
  size="normal"
  :loading="isTranslating"
  :disabled="isTranslating"
  @click="handleTranslateAll"
>
  {{
    isTranslating && translationProgress
      ? t('editor.translationProgress', {
          current: translationProgress.current,
          total: translationProgress.total,
        })
      : t('editor.translateAll')
  }}
</TranslateButton>
```

---

#### Методы

```typescript
// Перевод одной строки
async function handleTranslateRow(idx: number) {
  const row = rows.value[idx];
  if (!row?.text?.th?.trim()) return;
  
  const result = await translateSubtitle(row.text.th);
  if (result) {
    onUpdateText(idx, 'ru', result.ru);
    onUpdateText(idx, 'en', result.en);
  }
}

// Массовый перевод
async function handleTranslateAll() {
  const subtitlesToTranslate = rows.value
    .map((row, idx) => ({
      id: row.id ?? idx,
      th: row.text?.th || '',
      index: idx,
    }))
    .filter((item) => item.th.trim());

  await translateBatch(subtitlesToTranslate, (id, result) => {
    const subtitle = subtitlesToTranslate.find((s) => s.id === id);
    if (subtitle) {
      onUpdateText(subtitle.index, 'ru', result.ru);
      onUpdateText(subtitle.index, 'en', result.en);
    }
  });
}

// Computed: проверка наличия субтитров для перевода
const canTranslateAll = computed(() => {
  return rows.value.some((row) => row.text?.th?.trim());
});
```

---

## Конфигурация Gemini API

### Файл: `app/config/gemini.ts`

```typescript
export const GEMINI_DEFAULT_CONFIG = {
  model: 'gemini-2.5-flash-lite',  // Быстрая модель для переводов
  temperature: 0.15,                // Низкая температура для точности
  maxTokens: 2000,                  // Достаточно для субтитров
} as const;
```

### Промпт для перевода

**Системное сообщение:**
```
Ты профессиональный переводчик с тайского языка. 
Переводи точно, сохраняя смысл и контекст. 
Отвечай ТОЛЬКО в формате JSON.
```

**Пользовательское сообщение:**
```
Переведи следующий тайский текст на русский и английский языки:
"[тайский текст]"

Формат ответа:
{"ru": "русский перевод", "en": "english translation"}
```

---

## Локализация

### Файлы: `locales/ru.json` и `locales/en.json`

Добавлены следующие ключи в секцию `editor`:

```json
{
  "editor": {
    "translateRow": "Перевести / Translate",
    "translateAll": "Перевести все / Translate all",
    "translating": "Перевод... / Translating...",
    "translationProgress": "Переведено {current} из {total} / Translated {current} of {total}",
    "translationComplete": "Перевод завершен / Translation complete",
    "translationError": "Ошибка перевода / Translation error",
    "translationEmptyText": "Нет текста для перевода / No text to translate"
  }
}
```

---

## Оптимизация и производительность

### Кеширование

Система автоматически кеширует все переводы в Map:

```typescript
const translationCache = new Map<string, TranslationResult>();
```

**Преимущества:**
- Повторные запросы выполняются мгновенно
- Экономия API-вызовов
- Улучшение UX

**Время жизни кеша:**
- Кеш существует в рамках текущей сессии компонента
- Очищается при размонтировании компонента
- Можно очистить вручную через `clearCache()`

---

### Rate Limiting

Для предотвращения перегрузки API используется задержка между запросами:

```typescript
// Задержка 500ms между переводами при массовом переводе
if (i < subtitles.length - 1) {
  await new Promise((resolve) => setTimeout(resolve, 500));
}
```

**Настройки:**
- Задержка: 500ms
- Тип: последовательное выполнение
- Применяется только для `translateBatch()`

---

## Обработка ошибок

### Типы ошибок

1. **Пустой текст**
   ```typescript
   error.value = 'Пустой текст для перевода';
   ```

2. **Некорректный формат ответа API**
   ```typescript
   error.value = 'Некорректный формат ответа от API';
   ```

3. **Ошибки API** (обрабатываются в `useGemini`)
   - 429: Превышен лимит запросов
   - 403: Ошибка аутентификации
   - 400: Невалидный запрос
   - 500: Ошибка сервера

### Отображение ошибок

Ошибки отображаются в UI под кнопкой перевода:

```vue
<div v-if="translationError" class="subtitle-editor__error">
  {{ t('editor.translationError') }}: {{ translationError }}
</div>
```

Стили:
```scss
.subtitle-editor__error {
  padding: 8px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #b91c1c;
  font-size: 12px;
}
```

---

## Принципы проектирования

### SOLID

1. **Single Responsibility Principle (SRP)**
   - `useSubtitleTranslation` - только логика перевода
   - `TranslateButton` - только UI кнопки
   - `SubtitleEditor` - только редактирование субтитров

2. **Open/Closed Principle (OCP)**
   - `TranslateButton` легко расширяется через props
   - Новые источники перевода можно добавить без изменения существующего кода

3. **Dependency Inversion Principle (DIP)**
   - Компоненты зависят от абстракций (composables)
   - `useSubtitleTranslation` использует `useGemini` как зависимость

### DRY (Don't Repeat Yourself)

- Вся логика перевода в одном месте (`useSubtitleTranslation`)
- Переиспользуемый компонент `TranslateButton`
- Единая обработка ошибок
- Общие интерфейсы TypeScript

---

## Примеры использования

### Пример 1: Перевод одного субтитра

```vue
<script setup>
import { useSubtitleTranslation } from '~/composables/useSubtitleTranslation';

const { translateSubtitle, error } = useSubtitleTranslation();

async function translate() {
  const result = await translateSubtitle('สวัสดีครับ');
  if (result) {
    console.log('RU:', result.ru);
    console.log('EN:', result.en);
  } else {
    console.error('Ошибка:', error.value);
  }
}
</script>
```

---

### Пример 2: Массовый перевод с прогрессом

```vue
<script setup>
import { useSubtitleTranslation } from '~/composables/useSubtitleTranslation';

const {
  translateBatch,
  isTranslating,
  translationProgress,
} = useSubtitleTranslation();

const subtitles = [
  { id: 1, th: 'สวัสดีครับ' },
  { id: 2, th: 'ขอบคุณครับ' },
  { id: 3, th: 'ลาก่อนครับ' },
];

async function translateAll() {
  await translateBatch(subtitles, (id, result) => {
    console.log(`Субтитр ${id}:`, result);
  });
}
</script>

<template>
  <div>
    <button @click="translateAll" :disabled="isTranslating">
      {{ isTranslating ? 'Перевод...' : 'Перевести все' }}
    </button>
    
    <div v-if="translationProgress">
      Прогресс: {{ translationProgress.current }} / {{ translationProgress.total }}
    </div>
  </div>
</template>
```

---

### Пример 3: Кастомная кнопка перевода

```vue
<script setup>
import TranslateButton from '~/components/TranslateButton.vue';
import { useSubtitleTranslation } from '~/composables/useSubtitleTranslation';

const { translateSubtitle, isTranslatingId } = useSubtitleTranslation();
const text = ref('สวัสดีครับ');
const result = ref(null);

async function handleTranslate() {
  result.value = await translateSubtitle(text.value);
}
</script>

<template>
  <div>
    <input v-model="text" placeholder="Тайский текст" />
    
    <TranslateButton
      size="normal"
      :loading="isTranslatingId('custom-id')"
      :disabled="!text"
      @click="handleTranslate"
    >
      Перевести текст
    </TranslateButton>
    
    <div v-if="result">
      <p>RU: {{ result.ru }}</p>
      <p>EN: {{ result.en }}</p>
    </div>
  </div>
</template>
```

---

## Тестирование

### Ручное тестирование

1. **Перевод одной строки:**
   - Открыть редактор субтитров
   - Добавить субтитр с тайским текстом
   - Нажать "RU / EN" для раскрытия
   - Нажать кнопку "Перевести"
   - Проверить заполнение полей RU и EN

2. **Массовый перевод:**
   - Добавить несколько субтитров с тайским текстом
   - Нажать кнопку "Перевести все"
   - Наблюдать обновление прогресса
   - Проверить все переведённые субтитры

3. **Кеширование:**
   - Перевести субтитр
   - Перевести тот же текст повторно
   - Убедиться, что перевод происходит мгновенно

4. **Обработка ошибок:**
   - Попытаться перевести пустой текст
   - Проверить отображение сообщения об ошибке

---

## Возможные улучшения

### Краткосрочные

1. **Toast-уведомления** вместо встроенных сообщений об ошибках
2. **Анимация прогресса** для массового перевода
3. **Отмена массового перевода** (кнопка Cancel)
4. **Индикатор количества API-вызовов** из кеша

### Долгосрочные

1. **Пакетная обработка** - несколько субтитров в одном запросе
2. **Очередь запросов** для более сложного управления rate limiting
3. **Поддержка других языков** перевода
4. **История переводов** с возможностью отката
5. **Альтернативные переводчики** (Google Translate, DeepL)
6. **A/B тестирование** разных промптов

---

## Troubleshooting

### Проблема: Перевод не работает

**Решение:**
1. Проверить настройки Gemini API в `.env`
2. Проверить лимиты API
3. Посмотреть консоль браузера на наличие ошибок
4. Проверить формат ответа API

### Проблема: Медленный перевод

**Решение:**
1. Уменьшить `maxTokens` в конфигурации
2. Увеличить задержку между запросами
3. Использовать более быструю модель Gemini

### Проблема: Некорректные переводы

**Решение:**
1. Настроить `temperature` (уменьшить для большей точности)
2. Улучшить промпт в `useSubtitleTranslation`
3. Добавить примеры в системное сообщение

---

## Контакты и поддержка

При возникновении проблем или вопросов:
- Проверьте логи в консоли браузера
- Изучите документацию Gemini API
- Обратитесь к команде разработки

---

## Changelog

### v1.0.0 (2025-10-18)
- ✨ Добавлен функционал перевода субтитров
- ✨ Создан composable `useSubtitleTranslation`
- ✨ Создан компонент `TranslateButton`
- ✨ Интегрировано в `SubtitleEditor`
- ✨ Добавлено кеширование переводов
- ✨ Добавлена локализация RU/EN
- 📝 Создана документация
