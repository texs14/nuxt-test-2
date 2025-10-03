# Структура VideoPlayer после рефакторинга

```
app/
├── components/
│   ├── VideoPlayer/
│   │   ├── VideoPlayer.vue              (~290 строк) - главный контейнер
│   │   ├── VideoPlayerCore.vue          (~50 строк) - <video> элемент
│   │   ├── VideoSubtitle.vue            (~80 строк) - субтитры поверх видео
│   │   ├── SubtitleNavigationButtons.vue (~60 строк) - кнопки prev/next
│   │   ├── SubtitleTrack.vue            (~35 строк) - список субтитров
│   │   └── SubtitleCue.vue              (~90 строк) - элемент субтитра
│   │
│   ├── VideoControls/
│   │   ├── VideoControls.vue            (~50 строк) - контейнер контролов
│   │   ├── PlayButton.vue               (~25 строк) - play/pause
│   │   ├── VideoTimeline.vue            (~120 строк) - timeline с drag
│   │   ├── VolumeControl.vue            (~95 строк) - громкость
│   │   └── FullscreenButton.vue         (~20 строк) - fullscreen
│   │
│   └── ui/
│       ├── IconButton.vue               (~45 строк) - базовая кнопка
│       ├── InteractiveWord.vue          (существующий)
│       └── icons/
│           ├── PlayIcon.vue             (~20 строк)
│           ├── PauseIcon.vue            (~20 строк)
│           ├── ChevronLeftIcon.vue      (~20 строк)
│           ├── ChevronRightIcon.vue     (~20 строк)
│           ├── VolumeIcon.vue           (~15 строк)
│           └── FullscreenIcon.vue       (~20 строк)
│
├── composables/
│   ├── subtitles/
│   │   ├── useSubtitleNormalization.ts  (~35 строк)
│   │   ├── useSubtitleText.ts           (~65 строк)
│   │   ├── useSubtitleTokenization.ts   (~55 строк)
│   │   ├── useActiveSubtitle.ts         (~30 строк)
│   │   └── useSubtitleNavigation.ts     (~160 строк)
│   │
│   ├── video/
│   │   ├── useVideoPlayback.ts          (~115 строк)
│   │   ├── useRestrictedRange.ts        (~95 строк)
│   │   ├── useFullscreen.ts             (~60 строк)
│   │   └── useVideoKeyboard.ts          (~35 строк)
│   │
│   ├── controls/
│   │   ├── useTimelineDrag.ts           (~85 строк)
│   │   └── usePopupVisibility.ts        (~60 строк)
│   │
│   └── shared/
│       └── useAutoHide.ts               (~60 строк)
│
├── types/
│   └── video.types.ts                   (~50 строк)
│
├── utils/
│   └── time.ts                          (~20 строк)
│
└── assets/
    └── styles/
        └── video-player-variables.scss  (~65 строк)
```

## Статистика

### Старая структура
- VideoPlayer.vue: 871 строка
- VideoControls.vue: 373 строки
- **Итого: 1244 строки в 2 файлах**

### Новая структура
- Компоненты: ~960 строк в 17 файлах
- Composables: ~760 строк в 13 файлах
- Типы и утилиты: ~70 строк в 2 файлах
- Стили: ~65 строк в 1 файле
- **Итого: ~1855 строк в 33 файлах**

### Анализ

Хотя общее количество строк увеличилось на ~49%, это дало:

1. **Модульность**: 33 независимых модуля вместо 2 монолитов
2. **Переиспользуемость**: 13 composables доступны для других компонентов
3. **Поддерживаемость**: средний размер файла ~56 строк против 622
4. **Тестируемость**: каждый модуль тестируется отдельно
5. **Читаемость**: четкая структура и разделение ответственности

### Размер основных компонентов

| Компонент | До | После | Изменение |
|-----------|-------|--------|-----------|
| VideoPlayer | 871 | 290 | -67% |
| VideoControls | 373 | 50 | -87% |

## Зависимости между модулями

```
VideoPlayer.vue
├── VideoPlayerCore.vue
├── VideoSubtitle.vue
│   └── InteractiveWord.vue
├── SubtitleNavigationButtons.vue
│   ├── IconButton.vue
│   ├── ChevronLeftIcon.vue
│   └── ChevronRightIcon.vue
├── SubtitleTrack.vue
│   └── SubtitleCue.vue
├── VideoControls.vue
│   ├── PlayButton.vue
│   │   ├── IconButton.vue
│   │   ├── PlayIcon.vue
│   │   └── PauseIcon.vue
│   ├── VideoTimeline.vue
│   │   └── useTimelineDrag
│   ├── VolumeControl.vue
│   │   ├── IconButton.vue
│   │   ├── VolumeIcon.vue
│   │   └── usePopupVisibility
│   └── FullscreenButton.vue
│       ├── IconButton.vue
│       └── FullscreenIcon.vue
├── useSubtitleNormalization
├── useSubtitleText
├── useSubtitleTokenization
├── useActiveSubtitle
├── useSubtitleNavigation
├── useVideoPlayback
├── useRestrictedRange
├── useFullscreen
├── useVideoKeyboard
└── useAutoHide
```

## Преимущества структуры

### 1. Четкое разделение
- **Компоненты** - только представление
- **Composables** - бизнес-логика
- **Types** - типизация
- **Utils** - чистые функции
- **Styles** - переменные и миксины

### 2. Легко найти код
- Нужна навигация по субтитрам? → `composables/subtitles/useSubtitleNavigation.ts`
- Нужна кнопка play? → `components/VideoControls/PlayButton.vue`
- Нужна иконка? → `components/ui/icons/`

### 3. Простое тестирование
Каждый файл тестируется независимо:
```typescript
// tests/composables/subtitles/useSubtitleNavigation.spec.ts
import { useSubtitleNavigation } from '~/composables/subtitles/useSubtitleNavigation';
// ...тесты
```

### 4. Легкое расширение
Добавить новую функцию:
1. Создать новый composable
2. Импортировать в нужном компоненте
3. Использовать

Пример - добавление picture-in-picture:
```typescript
// composables/video/usePictureInPicture.ts
export const usePictureInPicture = (videoRef) => {
  // логика
}

// VideoPlayer.vue
import { usePictureInPicture } from '~/composables/video/usePictureInPicture';
const pip = usePictureInPicture(videoRef);
```
