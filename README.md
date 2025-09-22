# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.


## Авторизация (Supabase)

Ниже описана структура и логика e‑mail авторизации через модуль `@nuxtjs/supabase`.

### Структура

- `nuxt.config.ts`
  - Раздел `supabase.redirectOptions` управляет авто‑редиректами модуля:
    ```ts
    export default defineNuxtConfig({
      modules: ['@nuxtjs/supabase'],
      supabase: {
        redirectOptions: {
          login: '/login',
          callback: '/confirm',
          exclude: ['/', '/videos', '/videos/**']
        }
      },
      runtimeConfig: {
        public: {
          supabase: {
            url: process.env.SUPABASE_URL,
            key: process.env.SUPABASE_KEY
          }
        }
      }
    })
    ```
  - Переменные окружения читаются из `.env`: `SUPABASE_URL`, `SUPABASE_KEY`.

- `app/middleware/auth.ts`
  - Кастомное middleware защищает только те страницы, где указана мета `requiresAuth: true`.
  - Публичные маршруты не редиректятся: `'/', '/login', '/register', '/confirm'`.
  - Перед редиректом на `/login` исходный путь сохраняется в cookie через `useSupabaseCookieRedirect()`.
    ```ts
    export default defineNuxtRouteMiddleware((to) => {
      const user = useSupabaseUser()
      const redirectInfo = useSupabaseCookieRedirect()

      const publicPaths = new Set<string>(['/', '/login', '/register', '/confirm'])
      if (publicPaths.has(to.path) || to.meta?.requiresAuth === false) return

      if (to.meta?.requiresAuth && !user.value) {
        redirectInfo.path.value = to.fullPath
        return navigateTo('/login')
      }
    })
    ```

- Страницы
  - `app/pages/login.vue` — форма входа по e‑mail (OTP/magic link). Используется `supabase.auth.signInWithOtp`:
    ```ts
    const supabase = useSupabaseClient()
    const signInWithOtp = async () => {
      await supabase.auth.signInWithOtp({
        email: email.value,
        options: { emailRedirectTo: `${window.location.origin}/confirm` }
      })
    }
    ```
    Страница помечена как публичная: `definePageMeta({ requiresAuth: false })`.

  - `app/pages/confirm.vue` — обработка коллбэка после входа. Ждёт появления пользователя и возвращает на сохранённый маршрут:
    ```ts
    const user = useSupabaseUser()
    const redirectInfo = useSupabaseCookieRedirect()
    watch(user, () => {
      if (user.value) {
        const path = redirectInfo.pluck()
        return navigateTo(path || '/')
      }
    }, { immediate: true })
    ```
    Тоже публичная: `definePageMeta({ requiresAuth: false })`.

### Поток авторизации

1. Пользователь открывает защищённую страницу (где `definePageMeta({ requiresAuth: true })`).
2. `auth`‑middleware сохраняет целевой путь и перенаправляет на `/login`.
3. На `/login` пользователь вводит e‑mail, отправляется magic‑ссылка.
4. После перехода по ссылке Supabase перенаправляет на `/confirm`.
5. `/confirm` обнаруживает активного пользователя и возвращает на сохранённый путь (или `/`).

### Настройки в Supabase Dashboard

- В разделе Authentication → URL Configuration добавьте в Allowed Redirect URLs адрес:
  - для локальной разработки: `http://localhost:<порт>/confirm` (например, `3000` или `3001`).
- Убедитесь, что `.env` содержит корректные `SUPABASE_URL` и `SUPABASE_KEY`.

### Как пометить страницу как защищённую

Добавьте в компонент страницы:

```ts
definePageMeta({ requiresAuth: true })
```

### Примеры

- Выйти из аккаунта:
  ```ts
  const supabase = useSupabaseClient()
  await supabase.auth.signOut()
  ```

- Навигация (BEM‑классы используются в стилях компонентов, например, в `app/components/NavPanel.vue`).

### Примечания

- В корневом шаблоне `app/app.vue` используется `<NuxtPage />` для рендера страниц.
- Публичные маршруты управляются в `auth.ts` и в `supabase.redirectOptions.exclude`.

## Мультиязычность (i18n)

Реализована полноценная мультиязычность на базе официального модуля `@nuxtjs/i18n`.

- Стратегия URL: `prefix_except_default` — английская версия без префикса (`/`), русская — с префиксом (`/ru`).
- Локали: `en` (default), `ru`. BCP 47 теги заданы в `nuxt.config.ts`.
- Ленивые переводы: `lazy: true`, директория `locales/` (`en.json`, `ru.json`).
- Детект языка: `detectBrowserLanguage.useCookie = true`, cookie `i18n_redirected`, `redirectOn = 'root'`.
- SEO: глобальный вызов `useLocaleHead({ addDirAttribute: true, addSeoAttributes: true })` в `app/app.vue` формирует `<html lang/dir>`, `hreflang` и `canonical`.
- Локализованные маршруты и ссылки: используем `useLocalePath()` и `useSwitchLocalePath()`.

### Где настраивается

- `nuxt.config.ts` → модуль `@nuxtjs/i18n` с опциями, `vueI18n: './i18n.config.ts'`.
- `i18n.config.ts` → базовые опции Vue I18n (`legacy: false`, `fallbackLocale: 'en'`).
- `locales/en.json`, `locales/ru.json` → словари.
- `app/app.vue` → глобальный SEO-хед через `useLocaleHead()`.
- `app/components/NavPanel.vue` → нативный `<select>` для смены языка и локализованные ссылки.

### Как добавить ключ перевода

1. Добавьте ключ в `locales/en.json` и `locales/ru.json`.
2. Используйте в компонентах `const { t } = useI18n()` и далее `t('namespace.key')`.

### Как добавить новый язык

1. Добавьте файл в `locales/<code>.json`.
2. В `nuxt.config.ts` → в `locales` добавьте `{ code: '<code>', language: '<bcp47>', name: '<Label>', file: '<code>.json' }`.
3. При необходимости обновите селектор в `NavPanel.vue`.

### Acceptance Checklist

- GET `/` → английская версия без префикса; GET `/ru` → русская версия с префиксом.
- Переключатель языка сохраняет текущий маршрут и query-параметры.
- В `<head>/<html>` корректные `lang`, `dir`, `link[rel=alternate][hreflang]`.
- Загружается только активная локаль (+ fallback) при первом заходе.
- Cookie `i18n_redirected` устанавливается, редирект выполняется только на корне.