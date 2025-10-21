# Структура VideoPlayer

```
app/
├── components/
│   ├── VideoPlayer.vue                 — главный контейнер плеера
│   ├── VideoPlayer/
│   │   ├── DictionaryProcessLoader.vue — модальное окно пакетного добавления слов
│   │   ├── SubtitleCue.vue              — элемент списка субтитров
│   │   ├── SubtitleNavigationButtons.vue — кнопки перехода по субтитрам
│   │   ├── SubtitleTrack.vue            — список субтитров в аккордеоне
│   │   ├── VideoPlayerCore.vue          — оболочка `<video>` ивентов
│   │   └── VideoSubtitle.vue            — вывод активных субтитров поверх видео
│   ├── VideoControls.vue               — панель управления поверх видео
│   ├── VideoControls/
│   │   ├── FullscreenButton.vue
│   │   ├── PlayButton.vue
│   │   ├── VideoTimeline.vue
│   │   └── VolumeControl.vue
│   └── InteractiveWord.vue             — обёртка над словарём для подсветки слов
├── composables/
│   ├── subtitles/
│   │   ├── useActiveSubtitle.ts
│   │   ├── useSubtitleNavigation.ts
│   │   ├── useSubtitleNormalization.ts
│   │   ├── useSubtitleText.ts
│   │   └── useSubtitleTokenization.ts
│   ├── video/
│   │   ├── useFullscreen.ts
│   │   ├── useRestrictedRange.ts
│   │   ├── useVideoKeyboard.ts
│   │   └── useVideoPlayback.ts
│   ├── controls/
│   │   ├── usePopupVisibility.ts
│   │   └── useTimelineDrag.ts
│   ├── shared/
│   │   └── useAutoHide.ts
│   └── useDictionaryBatch.ts
├── types/
│   └── video.types.ts
└── utils/
    └── time.ts
```

## Основные контейнеры

- **`VideoPlayer.vue`** Обрабатывает весь жизненный цикл воспроизведения, управляет `UAccordion` из `@nuxt/ui`, пробрасывает события в контролы и субтитры.
- **`VideoControls.vue`** Визуальная панель с использованием `UIButton` и вложенных контролов; отвечает за взаимодействия play/pause, fullscreen и seek.
- **`InteractiveWord.vue`** Базовый компонент выделения слов, используемый в субтитрах и карточках.

## Подкомпоненты `VideoPlayer/`

- **`VideoPlayerCore.vue`** Хранит ссылку на `<video>`, реализует `defineExpose` для доступа из контейнера.
- **`VideoSubtitle.vue`** Форматирует активные токены, использует `InteractiveWord` для тайских слов, отображает вторую строку перевода.
- **`SubtitleNavigationButtons.vue`** Управляет кнопками prev/next, основан на `IconButton` и реагирует на `visible` из `useAutoHide`.
- **`SubtitleTrack.vue`** Рендерит аккордеон субтитров, делегирует клик `SubtitleCue`.
- **`SubtitleCue.vue`** Показывает диапазон времени, тексты на нескольких языках, инициирует пакетное добавление слов через `useDictionaryBatch` и управляет `DictionaryProcessLoader`.
- **`DictionaryProcessLoader.vue`** Отвечает за UI прогресса пакетной обработки слов, отображает переходные состояния и действия `cancel/close`.

## Подкомпоненты `VideoControls/`

- **`PlayButton.vue`** Кнопка play/pause на `IconButton`, работает через событие `toggle`.
- **`VideoTimeline.vue`** Интерфейс перемотки с `useTimelineDrag`, отображает текущую и общую длительность через `formatTime`.
- **`VolumeControl.vue`** Вертикальный слайдер, использует `usePopupVisibility` для управления popover и эмитит `set-volume`.
- **`FullscreenButton.vue`** Прокидывает событие `toggle` в `useFullscreen` контейнера.

## Используемые composables

- **Видео**: `useVideoPlayback`, `useRestrictedRange`, `useFullscreen`, `useVideoKeyboard` — управляют состоянием воспроизведения, ограниченными диапазонами и горячими клавишами.
- **Субтитры**: `useSubtitleNormalization`, `useSubtitleText`, `useActiveSubtitle`, `useSubtitleNavigation`, `useSubtitleTokenization` — нормализуют данные, выбирают активные строки, формируют токены и двигают курсор.
- **Контролы**: `useTimelineDrag`, `usePopupVisibility` — отвечают за drag timeline и отображение попапа громкости.
- **Общее**: `useAutoHide` — управляет видимостью панели управления; `useDictionaryBatch` orchestrирует пакетную отправку слов в словарь.

## Поток данных и события

- **`VideoPlayer.vue`** подписывается на события `<video>` (`timeupdate`, `play`, `pause`) и синхронизирует `useVideoPlayback`.
- **`handleSeek`** обрабатывает перемотку, используя `useRestrictedRange` для ограничения диапазонов.
- **`controlsAutoHide`** контролирует появление `VideoControls` и `SubtitleNavigationButtons`.
- **`SubtitleCue.vue`** инициирует модальное окно словаря и взаимодействует с Supabase (`useSupabaseClient`, `useSupabaseUser`) для проверки ролей.

## Зависимости между модулями

```
VideoPlayer.vue
├── VideoPlayer/VideoPlayerCore.vue
├── VideoPlayer/VideoSubtitle.vue
│   └── InteractiveWord.vue
├── VideoPlayer/SubtitleNavigationButtons.vue
│   └── IconButton.vue
├── VideoPlayer/SubtitleTrack.vue
│   └── VideoPlayer/SubtitleCue.vue
│       ├── InteractiveWord.vue
│       ├── VideoPlayer/DictionaryProcessLoader.vue
│       └── useDictionaryBatch
├── VideoControls.vue
│   ├── UIButton.vue
│   ├── VideoControls/PlayButton.vue
│   │   └── IconButton.vue
│   ├── VideoControls/VideoTimeline.vue
│   │   └── useTimelineDrag
│   ├── VideoControls/VolumeControl.vue
│   │   ├── IconButton.vue
│   │   └── usePopupVisibility
│   └── VideoControls/FullscreenButton.vue
│       └── IconButton.vue
├── useVideoPlayback
├── useRestrictedRange
├── useFullscreen
├── useVideoKeyboard
├── useSubtitleNormalization
├── useSubtitleText
├── useSubtitleTokenization
├── useActiveSubtitle
├── useSubtitleNavigation
└── useAutoHide
```

## Расширение

- **Добавление новой функции**: создать composable или UI-компонент, зарегистрировать его в контейнере (`VideoPlayer.vue` или `VideoControls.vue`), использовать существующие токи данных.
- **Подключение новой команды управления**: расширить `VideoControls.vue`, обновить `useVideoKeyboard`/`useVideoPlayback`, прописать события в контейнере.
- **Новые форматы субтитров**: дополнить преобразование в `useSubtitleNormalization` и типы в `app/types/video.types.ts`.
