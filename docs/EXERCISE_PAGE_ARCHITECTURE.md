# Архитектура страницы упражнений

Документация описывает архитектуру, логику и взаимосвязи компонентов страницы упражнений `/videos/exercise/[id]` и компонента `SubtitleClickExercise.vue`.

## Оглавление

1. [Обзор системы](#обзор-системы)
2. [Структура данных Supabase](#структура-данных-supabase)
3. [Архитектура компонентов](#архитектура-компонентов)
4. [Поток данных](#поток-данных)
5. [Логика работы упражнения](#логика-работы-упражнения)
6. [Хранение прогресса](#хранение-прогресса)
7. [Взаимодействие компонентов](#взаимодействие-компонентов)

---

## Обзор системы

Страница упражнений представляет собой интерактивную обучающую систему, где пользователь собирает тайские предложения из набора слов, синхронизируя работу с видео плеером.

### Основные компоненты:

- **`/pages/videos/exercise/[id].vue`** - главная страница упражнения
- **`ExerciseVideoPlayer.vue`** - минималистичный видео плеер для воспроизведения фрагментов
- **`SubtitleClickExercise.vue`** - компонент игровой механики сборки предложений

---

## Структура данных Supabase

### Таблица `video_items`

Основная таблица для хранения видео контента.

```typescript
interface VideoItem {
  id: string | number;              // UUID или числовой ID
  title: Json | string;              // Мультиязычный заголовок { en: string, ru: string, th: string }
  description?: Json | string;       // Мультиязычное описание (опционально)
  level?: string | null;             // Уровень сложности (A1, A2, B1, etc.)
  video_url?: string | null;         // URL видео файла
  subtitles?: SubtitleItem[] | null; // JSON массив субтитров
}
```

### Структура субтитров (`subtitles`)

Субтитры хранятся в формате JSON массива внутри поля `subtitles`:

```typescript
interface SubtitleItem {
  id?: number | string;    // Уникальный ID субтитра
  start: number;           // Время начала (секунды)
  end: number;             // Время окончания (секунды)
  text?: SubtitleText | string; // Текст или объект с переводами
}

interface SubtitleText {
  th?: string | ThaiSentences;  // Тайский текст (строка или структурированный)
  en?: string;                   // Английский перевод
  ru?: string;                   // Русский перевод
  [key: string]: string | ThaiSentences | undefined;
}

// Структурированный формат для тайского текста
interface ThaiSentences {
  sentences: string[][];  // Массив предложений, где каждое предложение - массив слов
  // Пример: [["สวัสดี", "ครับ"], ["ยินดี", "ต้อนรับ"]]
}
```

### Таблица `profiles`

Связь с пользователями для отслеживания прогресса (опционально).

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email CITEXT NOT NULL UNIQUE,
  username CITEXT UNIQUE,
  vocabulary BIGINT[] DEFAULT '{}',  -- Массив ID из словаря
  -- другие поля...
)
```

### Таблица `comments`

```typescript
interface CommentItem {
  id: string | number;
  text?: string | null;
  author?: string | null;
  created_at?: string | null;
  video_id: string | number;  // Связь с video_items
}
```

---

## Архитектура компонентов

### 1. `/pages/videos/exercise/[id].vue`

**Роль**: Контейнер-страница, координирующая работу упражнения.

#### Основные обязанности:
- Загрузка данных видео из Supabase
- Управление состоянием загрузки (loading, error states)
- Синхронизация между `ExerciseVideoPlayer` и `SubtitleClickExercise`
- Навигация (ссылка назад на страницу видео)

#### Ключевые состояния:

```typescript
const video = ref<VideoItem | null>(null);        // Данные видео из Supabase
const exerciseRange = ref<PlaybackRange | null>(null); // Текущий фрагмент для проигрывания
const loadingTimedOut = ref(false);               // Таймаут загрузки (30 сек)
```

#### Взаимодействие:

```
┌─────────────────────────────────────────────┐
│  /pages/videos/exercise/[id].vue           │
│                                             │
│  1. Загружает video из Supabase            │
│  2. Извлекает subtitles из video           │
│  3. Передает данные в дочерние компоненты  │
└────────────┬────────────────────┬───────────┘
             │                    │
             ▼                    ▼
┌────────────────────┐  ┌──────────────────────────┐
│ ExerciseVideoPlayer│  │ SubtitleClickExercise    │
│                    │  │                          │
│ Props:             │  │ Props:                   │
│ - src (video_url)  │  │ - subtitles (массив)     │
│ - range            │  │ - video-id               │
│                    │  │                          │
│ Emits:             │  │ Emits:                   │
│ - fragment-ended   │  │ - range-change           │
└────────────────────┘  └──────────────────────────┘
```

---

### 2. `ExerciseVideoPlayer.vue`

**Роль**: Специализированный видео плеер для воспроизведения коротких фрагментов.

#### Особенности:
- **Нет UI элементов управления** (play/pause/timeline)
- **Автоматическое воспроизведение** при смене фрагмента
- **Автоматическая остановка** при достижении конца фрагмента
- **Интерактивные кнопки** после остановки:
  - "Проиграть ещё раз" (скорость 1x)
  - "Проиграть с замедлением" (скорость 0.6x)

#### Логика работы:

```typescript
// Входные данные
props: {
  src: string;                    // URL видео
  range: PlaybackRange | null;    // { start: number, end: number }
}

// Состояния
const showButtons = ref(false);   // Показывать ли кнопки повтора
const isReady = ref(false);       // Готовность видео к воспроизведению

// Основной цикл работы
watch(props.range, (newRange) => {
  if (newRange && isReady) {
    playFragment();  // Автоматически проигрывает новый фрагмент
  }
});

// Проверка окончания фрагмента
handleTimeUpdate() {
  if (video.currentTime >= range.end) {
    video.pause();
    showButtons.value = true;      // Показать кнопки
    emit('fragment-ended');
  }
}
```

#### Методы воспроизведения:

```typescript
// Нормальное воспроизведение
playNormal() {
  video.currentTime = range.start;
  video.playbackRate = 1;
  video.play();
}

// Замедленное воспроизведение
playSlow() {
  video.currentTime = range.start;
  video.playbackRate = 0.6;
  video.play();
}
```

---

### 3. `SubtitleClickExercise.vue`

**Роль**: Игровая механика сборки предложений из слов.

#### Основные обязанности:
- Парсинг тайских субтитров в отдельные слова
- Перемешивание слов для сложности
- Отслеживание выбора слов пользователем
- Валидация правильности порядка слов
- Сохранение прогресса в localStorage
- Управление подсказками и ошибками

#### Ключевые состояния:

```typescript
// Данные упражнения
const sentences = computed<SentenceStep[]>(() => [...]);  // Все предложения из субтитров
const currentStepIndex = ref(0);                          // Текущее предложение
const currentSentence = computed(() => sentences.value[currentStepIndex.value]);

// Игровое состояние
const collectedSlots = ref<CollectedSlot[]>([]);         // Собранные слова
const availableWords = ref<WordToken[]>([]);             // Доступные для выбора слова
const checkState = ref<'idle' | 'success'>('idle');      // Состояние проверки

// Прогресс
const completedSentences = ref<Set<string>>(new Set()); // Завершенные предложения
const history = ref<HistoryItem[]>([]);                  // История попыток

// Подсказки и ошибки
const wrongClicksInRow = ref(0);                         // Счетчик ошибок подряд
const errorWordId = ref<string | null>(null);            // ID слова с ошибкой (анимация)
const hintWordId = ref<string | null>(null);             // ID слова-подсказки (после 3 ошибок)
```

---

## Поток данных

### 1. Загрузка данных

```
Пользователь → /exercise/[id]
         ↓
    useAsyncData
         ↓
Supabase.from('video_items')
  .select('id, title, video_url, subtitles')
  .eq('id', id)
         ↓
    VideoItem { subtitles: SubtitleItem[] }
         ↓
  Передача в компоненты
```

### 2. Обработка субтитров

```typescript
// В SubtitleClickExercise.vue

// Шаг 1: Извлечение тайского текста
function extractThaiSource(text: SubtitleItem['text']): string | ThaiSentences {
  if (typeof text === 'string') return text;
  if (isThaiSentences(text)) return text;
  return text.th || text['th-TH'] || null;
}

// Шаг 2: Сегментация текста на слова
function segmentThaiText(text: string): string[] {
  // Использует Intl.Segmenter для корректной сегментации тайского текста
  if (thaiWordSegmenter) {
    return [...thaiWordSegmenter.segment(text)]
      .filter(item => item.isWordLike)
      .map(item => item.segment.trim());
  }
  // Fallback: разделение по пробелам
  return text.split(' ').filter(Boolean);
}

// Шаг 3: Создание структуры предложения
const sentences = computed<SentenceStep[]>(() => {
  return subtitles.map((item, index) => ({
    id: `${item.id ?? index}`,
    words: segmentedWords,  // Массив WordToken
    start: item.start,
    end: item.end
  }));
});
```

### 3. Синхронизация видео и упражнения

```
SubtitleClickExercise         ExerciseVideoPlayer
       │                              │
       │  emit('range-change',        │
       │    { start: 10.5,            │
       │      end: 15.2 })             │
       ├────────────────────────────>│
       │                              │ watch(props.range)
       │                              │      ↓
       │                              │ video.currentTime = 10.5
       │                              │ video.play()
       │                              │      ↓
       │                              │ (воспроизведение)
       │                              │      ↓
       │                              │ currentTime >= 15.2
       │                              │      ↓
       │                              │ video.pause()
       │ emit('fragment-ended')       │ showButtons = true
       │<────────────────────────────┤
       │                              │
```

---

## Логика работы упражнения

### Жизненный цикл одного предложения

```
1. ИНИЦИАЛИЗАЦИЯ
   ↓
   currentSentence меняется
   ↓
   watch(currentSentence) → {
     - collectedSlots = []
     - availableWords = shuffle(sentence.words)
     - emit('range-change', { start, end })  ← ТРИГГЕР ВИДЕО
   }
   
2. ВИДЕО ПРОИГРЫВАЕТСЯ
   ↓
   ExerciseVideoPlayer автоматически проигрывает фрагмент
   ↓
   Фрагмент завершается → showButtons = true
   
3. ПОЛЬЗОВАТЕЛЬ СОБИРАЕТ СЛОВА
   ↓
   handleWordClick(wordId) {
     const correctWord = sentence.words[collectedSlots.length];
     
     if (clickedWord.text === correctWord.text) {
       ✓ Добавить в collectedSlots
       ✓ Убрать из availableWords
       ✓ wrongClicksInRow = 0
       
       if (все слова собраны) {
         → УСПЕХ
       }
     } else {
       ✗ Показать анимацию ошибки (shake)
       ✗ wrongClicksInRow++
       
       if (wrongClicksInRow >= 3) {
         → Показать подсказку (highlight правильного слова)
       }
     }
   }
   
4. УСПЕХ
   ↓
   - checkState = 'success'
   - completedSentences.add(sentenceId)
   - addToHistory(true)
   - saveProgress()  ← LocalStorage
   ↓
   setTimeout(() => {
     currentStepIndex++  → Переход к следующему предложению
   }, 1500)
   ↓
   Цикл повторяется с шага 1
```

### Валидация порядка слов

```typescript
// Правильное слово определяется позицией в исходном массиве
const nextIndex = collectedSlots.length;  // Следующая позиция для заполнения
const correctWord = currentSentence.words[nextIndex];  // Ожидаемое слово

// Сравнение по тексту (не по ID!)
if (clickedWord.text === correctWord.text) {
  // Правильно
} else {
  // Ошибка
}
```

### Система подсказок

```typescript
// Отслеживание ошибок
let wrongClicksInRow = ref(0);

handleWordClick(wordId) {
  if (неправильное_слово) {
    wrongClicksInRow.value++;
    
    // После 3 ошибок подряд
    if (wrongClicksInRow.value >= 3) {
      const correctWord = sentence.words[nextIndex];
      const hint = availableWords.find(w => w.text === correctWord.text);
      hintWordId.value = hint?.id;  // Подсвечивается желтым + пульсация
    }
  } else {
    wrongClicksInRow.value = 0;  // Сброс при правильном выборе
    hintWordId.value = null;
  }
}
```

---

## Хранение прогресса

### LocalStorage структура

```typescript
// Ключ хранения
const STORAGE_KEY = `click-exercise-progress-${videoId}`;

// Структура данных
interface StoredProgress {
  completedSentences: string[];      // Массив ID завершенных предложений
  history: HistoryItem[];            // История всех попыток
  currentStepIndex: number;          // Текущий индекс предложения
}

interface HistoryItem {
  sentenceId: string;
  userWords: HistoryWord[];          // Последовательность выбранных слов
  isCorrect: boolean;                // Успешно ли завершено
}
```

### Операции с прогрессом

```typescript
// Загрузка при монтировании
onMounted(() => {
  loadProgress();  // Восстанавливает completedSentences, history, currentStepIndex
});

// Автосохранение при изменениях
watch([completedSentences, history, currentStepIndex], () => {
  saveProgress();  // Сериализация в JSON → localStorage
}, { deep: true });

// Сброс при смене видео
watch(() => props.videoId, () => {
  loadProgress();  // Загрузка прогресса нового видео
});
```

---

## Взаимодействие компонентов

### Схема коммуникации

```
┌─────────────────────────────────────────────────────────┐
│ /pages/videos/exercise/[id].vue                         │
│                                                          │
│ State:                                                   │
│  - video: VideoItem (из Supabase)                       │
│  - exerciseRange: { start, end } | null                 │
│                                                          │
└────────────┬────────────────────────┬────────────────────┘
             │ Props                  │ Props
             │                        │
  ┌──────────▼──────────┐  ┌──────────▼────────────────────┐
  │ ExerciseVideoPlayer │  │ SubtitleClickExercise         │
  │                     │  │                               │
  │ Props:              │  │ Props:                        │
  │  :src               │  │  :subtitles                   │
  │  :range ◄───────────┼──┼─ :video-id                    │
  │                     │  │                               │
  │ Methods:            │  │ Methods:                      │
  │  playFragment()     │  │  handleWordClick()            │
  │  playNormal()       │  │  segmentThaiText()            │
  │  playSlow()         │  │  loadProgress()               │
  │                     │  │  saveProgress()               │
  │                     │  │                               │
  │ Events:             │  │ Events:                       │
  │  @fragment-ended ───┼─►│                               │
  │                     │  │  @range-change ───────────────┤
  └─────────────────────┘  └───────────────────────────────┘
                                      │
                                      ▼
                              ┌──────────────────┐
                              │ LocalStorage     │
                              │                  │
                              │ Key: click-      │
                              │   exercise-      │
                              │   progress-{id}  │
                              └──────────────────┘
```

### Детальный поток событий

```typescript
// 1. Пользователь кликает на слово
SubtitleClickExercise: handleWordClick(wordId)
  ↓
  Проверка правильности
  ↓
  Если все слова собраны:
    emit('range-change', null)  // Очистка диапазона
    currentStepIndex++           // Переход к следующему
  ↓
  
// 2. Смена предложения
watch(currentSentence, (newSentence) => {
  emit('range-change', { start: newSentence.start, end: newSentence.end })
})
  ↓
  
// 3. Родительский компонент получает событие
ExercisePage: handleExerciseRangeChange(range)
  ↓
  exerciseRange.value = range
  ↓
  
// 4. ExerciseVideoPlayer реагирует на изменение
watch(props.range, (newRange) => {
  playFragment()  // Автоматическое воспроизведение
})
  ↓
  video.currentTime = range.start
  video.play()
  ↓
  
// 5. Окончание фрагмента
handleTimeUpdate() {
  if (currentTime >= range.end) {
    pause()
    showButtons = true
    emit('fragment-ended')
  }
}
  ↓
  
// 6. Родительский компонент (опционально)
ExercisePage: handleFragmentEnded()
  // Можно добавить дополнительную логику
```

---

## Оптимизации и особенности

### 1. Сегментация тайского текста

Используется **Intl.Segmenter** для корректного разбиения тайского текста на слова (в тайском нет пробелов между словами):

```typescript
const thaiWordSegmenter = new Intl.Segmenter('th', { granularity: 'word' });

for (const item of thaiWordSegmenter.segment(text)) {
  if (item.isWordLike) {
    words.push(item.segment);
  }
}
```

### 2. Предотвращение дублей в availableWords

Каждое слово получает уникальный ID при создании:

```typescript
words.map((word, wordIndex) => ({
  id: `${baseId}-${wordIndex}`,  // Уникальный ID
  text: word                       // Фактический текст
}));
```

### 3. Анимации обратной связи

- **Ошибка**: `shake` анимация + красная подсветка (600ms)
- **Подсказка**: `pulse-yellow` анимация + желтая подсветка (бесконечная, пока слово не выбрано)
- **Успех**: Зеленая подсветка собранных слов + сообщение

### 4. Таймаут загрузки

```typescript
// Защита от бесконечной загрузки
const loadingTimeout = setTimeout(() => {
  loadingTimedOut.value = true;  // Показать сообщение об ошибке
}, 30000);  // 30 секунд
```

---

## Расширяемость

### Возможные улучшения:

1. **Интеграция с Supabase для прогресса**
   - Сохранение прогресса в таблице `user_progress`
   - Синхронизация между устройствами
   
2. **Статистика и аналитика**
   - Отслеживание времени выполнения
   - Анализ частых ошибок
   - Рекомендации сложности

3. **Социальные функции**
   - Таблица лидеров
   - Совместное прохождение

4. **Дополнительные режимы упражнений**
   - Диктант (аудио → текст)
   - Перевод (тайский → русский/английский)
   - Множественный выбор

---

## Заключение

Система упражнений построена на принципах:
- **Модульность**: каждый компонент отвечает за свою задачу
- **Реактивность**: Vue 3 Composition API для эффективного управления состоянием
- **Персистентность**: LocalStorage для сохранения прогресса
- **UX**: мгновенная обратная связь, подсказки, анимации

Архитектура позволяет легко расширять функциональность и добавлять новые типы упражнений.
