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


## РђРІС‚РѕСЂРёР·Р°С†РёСЏ (Supabase)

РќРёР¶Рµ РѕРїРёСЃР°РЅР° СЃС‚СЂСѓРєС‚СѓСЂР° Рё Р»РѕРіРёРєР° eвЂ‘mail Р°РІС‚РѕСЂРёР·Р°С†РёРё С‡РµСЂРµР· РјРѕРґСѓР»СЊ `@nuxtjs/supabase`.

### РЎС‚СЂСѓРєС‚СѓСЂР°

- `nuxt.config.ts`
  - Р Р°Р·РґРµР» `supabase.redirectOptions` СѓРїСЂР°РІР»СЏРµС‚ Р°РІС‚РѕвЂ‘СЂРµРґРёСЂРµРєС‚Р°РјРё РјРѕРґСѓР»СЏ:
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
  - РџРµСЂРµРјРµРЅРЅС‹Рµ РѕРєСЂСѓР¶РµРЅРёСЏ С‡РёС‚Р°СЋС‚СЃСЏ РёР· `.env`: `SUPABASE_URL`, `SUPABASE_KEY`.

- `app/middleware/auth.ts`
  - РљР°СЃС‚РѕРјРЅРѕРµ middleware Р·Р°С‰РёС‰Р°РµС‚ С‚РѕР»СЊРєРѕ С‚Рµ СЃС‚СЂР°РЅРёС†С‹, РіРґРµ СѓРєР°Р·Р°РЅР° РјРµС‚Р° `requiresAuth: true`.
  - РџСѓР±Р»РёС‡РЅС‹Рµ РјР°СЂС€СЂСѓС‚С‹ РЅРµ СЂРµРґРёСЂРµРєС‚СЏС‚СЃСЏ: `'/', '/login', '/register', '/confirm'`.
  - РџРµСЂРµРґ СЂРµРґРёСЂРµРєС‚РѕРј РЅР° `/login` РёСЃС…РѕРґРЅС‹Р№ РїСѓС‚СЊ СЃРѕС…СЂР°РЅСЏРµС‚СЃСЏ РІ cookie С‡РµСЂРµР· `useSupabaseCookieRedirect()`.
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

- РЎС‚СЂР°РЅРёС†С‹
  - `app/pages/login.vue` вЂ” С„РѕСЂРјР° РІС…РѕРґР° РїРѕ eвЂ‘mail (OTP/magic link). РСЃРїРѕР»СЊР·СѓРµС‚СЃСЏ `supabase.auth.signInWithOtp`:
    ```ts
    const supabase = useSupabaseClient()
    const signInWithOtp = async () => {
      await supabase.auth.signInWithOtp({
        email: email.value,
        options: { emailRedirectTo: `${window.location.origin}/confirm` }
      })
    }
    ```
    РЎС‚СЂР°РЅРёС†Р° РїРѕРјРµС‡РµРЅР° РєР°Рє РїСѓР±Р»РёС‡РЅР°СЏ: `definePageMeta({ requiresAuth: false })`.

  - `app/pages/confirm.vue` вЂ” РѕР±СЂР°Р±РѕС‚РєР° РєРѕР»Р»Р±СЌРєР° РїРѕСЃР»Рµ РІС…РѕРґР°. Р–РґС‘С‚ РїРѕСЏРІР»РµРЅРёСЏ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ Рё РІРѕР·РІСЂР°С‰Р°РµС‚ РЅР° СЃРѕС…СЂР°РЅС‘РЅРЅС‹Р№ РјР°СЂС€СЂСѓС‚:
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
    РўРѕР¶Рµ РїСѓР±Р»РёС‡РЅР°СЏ: `definePageMeta({ requiresAuth: false })`.

### РџРѕС‚РѕРє Р°РІС‚РѕСЂРёР·Р°С†РёРё

1. РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ РѕС‚РєСЂС‹РІР°РµС‚ Р·Р°С‰РёС‰С‘РЅРЅСѓСЋ СЃС‚СЂР°РЅРёС†Сѓ (РіРґРµ `definePageMeta({ requiresAuth: true })`).
2. `auth`вЂ‘middleware СЃРѕС…СЂР°РЅСЏРµС‚ С†РµР»РµРІРѕР№ РїСѓС‚СЊ Рё РїРµСЂРµРЅР°РїСЂР°РІР»СЏРµС‚ РЅР° `/login`.
3. РќР° `/login` РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ РІРІРѕРґРёС‚ eвЂ‘mail, РѕС‚РїСЂР°РІР»СЏРµС‚СЃСЏ magicвЂ‘СЃСЃС‹Р»РєР°.
4. РџРѕСЃР»Рµ РїРµСЂРµС…РѕРґР° РїРѕ СЃСЃС‹Р»РєРµ Supabase РїРµСЂРµРЅР°РїСЂР°РІР»СЏРµС‚ РЅР° `/confirm`.
5. `/confirm` РѕР±РЅР°СЂСѓР¶РёРІР°РµС‚ Р°РєС‚РёРІРЅРѕРіРѕ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ Рё РІРѕР·РІСЂР°С‰Р°РµС‚ РЅР° СЃРѕС…СЂР°РЅС‘РЅРЅС‹Р№ РїСѓС‚СЊ (РёР»Рё `/`).

### РќР°СЃС‚СЂРѕР№РєРё РІ Supabase Dashboard

- Р’ СЂР°Р·РґРµР»Рµ Authentication в†’ URL Configuration РґРѕР±Р°РІСЊС‚Рµ РІ Allowed Redirect URLs Р°РґСЂРµСЃ:
  - РґР»СЏ Р»РѕРєР°Р»СЊРЅРѕР№ СЂР°Р·СЂР°Р±РѕС‚РєРё: `http://localhost:<РїРѕСЂС‚>/confirm` (РЅР°РїСЂРёРјРµСЂ, `3000` РёР»Рё `3001`).
- РЈР±РµРґРёС‚РµСЃСЊ, С‡С‚Рѕ `.env` СЃРѕРґРµСЂР¶РёС‚ РєРѕСЂСЂРµРєС‚РЅС‹Рµ `SUPABASE_URL` Рё `SUPABASE_KEY`.

### РљР°Рє РїРѕРјРµС‚РёС‚СЊ СЃС‚СЂР°РЅРёС†Сѓ РєР°Рє Р·Р°С‰РёС‰С‘РЅРЅСѓСЋ

Р”РѕР±Р°РІСЊС‚Рµ РІ РєРѕРјРїРѕРЅРµРЅС‚ СЃС‚СЂР°РЅРёС†С‹:

```ts
definePageMeta({ requiresAuth: true })
```

### РџСЂРёРјРµСЂС‹

- Р’С‹Р№С‚Рё РёР· Р°РєРєР°СѓРЅС‚Р°:
  ```ts
  const supabase = useSupabaseClient()
  await supabase.auth.signOut()
  ```

- РќР°РІРёРіР°С†РёСЏ (BEMвЂ‘РєР»Р°СЃСЃС‹ РёСЃРїРѕР»СЊР·СѓСЋС‚СЃСЏ РІ СЃС‚РёР»СЏС… РєРѕРјРїРѕРЅРµРЅС‚РѕРІ, РЅР°РїСЂРёРјРµСЂ, РІ `app/components/NavPanel.vue`).

### РџСЂРёРјРµС‡Р°РЅРёСЏ

- Р’ РєРѕСЂРЅРµРІРѕРј С€Р°Р±Р»РѕРЅРµ `app/app.vue` РёСЃРїРѕР»СЊР·СѓРµС‚СЃСЏ `<NuxtPage />` РґР»СЏ СЂРµРЅРґРµСЂР° СЃС‚СЂР°РЅРёС†.
- РџСѓР±Р»РёС‡РЅС‹Рµ РјР°СЂС€СЂСѓС‚С‹ СѓРїСЂР°РІР»СЏСЋС‚СЃСЏ РІ `auth.ts` Рё РІ `supabase.redirectOptions.exclude`.

## РњСѓР»СЊС‚РёСЏР·С‹С‡РЅРѕСЃС‚СЊ (i18n)

Р РµР°Р»РёР·РѕРІР°РЅР° РїРѕР»РЅРѕС†РµРЅРЅР°СЏ РјСѓР»СЊС‚РёСЏР·С‹С‡РЅРѕСЃС‚СЊ РЅР° Р±Р°Р·Рµ РѕС„РёС†РёР°Р»СЊРЅРѕРіРѕ РјРѕРґСѓР»СЏ `@nuxtjs/i18n`.

- РЎС‚СЂР°С‚РµРіРёСЏ URL: `prefix_except_default` вЂ” Р°РЅРіР»РёР№СЃРєР°СЏ РІРµСЂСЃРёСЏ Р±РµР· РїСЂРµС„РёРєСЃР° (`/`), СЂСѓСЃСЃРєР°СЏ вЂ” СЃ РїСЂРµС„РёРєСЃРѕРј (`/ru`).
- Р›РѕРєР°Р»Рё: `en` (default), `ru`. BCP 47 С‚РµРіРё Р·Р°РґР°РЅС‹ РІ `nuxt.config.ts`.
- Р›РµРЅРёРІС‹Рµ РїРµСЂРµРІРѕРґС‹: `lazy: true`, РґРёСЂРµРєС‚РѕСЂРёСЏ `locales/` (`en.json`, `ru.json`).
- Р”РµС‚РµРєС‚ СЏР·С‹РєР°: `detectBrowserLanguage.useCookie = true`, cookie `i18n_redirected`, `redirectOn = 'root'`.
- SEO: РіР»РѕР±Р°Р»СЊРЅС‹Р№ РІС‹Р·РѕРІ `useLocaleHead({ addDirAttribute: true, addSeoAttributes: true })` РІ `app/app.vue` С„РѕСЂРјРёСЂСѓРµС‚ `<html lang/dir>`, `hreflang` Рё `canonical`.
- Р›РѕРєР°Р»РёР·РѕРІР°РЅРЅС‹Рµ РјР°СЂС€СЂСѓС‚С‹ Рё СЃСЃС‹Р»РєРё: РёСЃРїРѕР»СЊР·СѓРµРј `useLocalePath()` Рё `useSwitchLocalePath()`.

### Р“РґРµ РЅР°СЃС‚СЂР°РёРІР°РµС‚СЃСЏ

- `nuxt.config.ts` в†’ РјРѕРґСѓР»СЊ `@nuxtjs/i18n` СЃ РѕРїС†РёСЏРјРё, `vueI18n: './i18n.config.ts'`.
- `i18n.config.ts` в†’ Р±Р°Р·РѕРІС‹Рµ РѕРїС†РёРё Vue I18n (`legacy: false`, `fallbackLocale: 'en'`).
- `locales/en.json`, `locales/ru.json` в†’ СЃР»РѕРІР°СЂРё.
- `app/app.vue` в†’ РіР»РѕР±Р°Р»СЊРЅС‹Р№ SEO-С…РµРґ С‡РµСЂРµР· `useLocaleHead()`.
- `app/components/NavPanel.vue` в†’ РЅР°С‚РёРІРЅС‹Р№ `<select>` РґР»СЏ СЃРјРµРЅС‹ СЏР·С‹РєР° Рё Р»РѕРєР°Р»РёР·РѕРІР°РЅРЅС‹Рµ СЃСЃС‹Р»РєРё.

### РљР°Рє РґРѕР±Р°РІРёС‚СЊ РєР»СЋС‡ РїРµСЂРµРІРѕРґР°

1. Р”РѕР±Р°РІСЊС‚Рµ РєР»СЋС‡ РІ `locales/en.json` Рё `locales/ru.json`.
2. РСЃРїРѕР»СЊР·СѓР№С‚Рµ РІ РєРѕРјРїРѕРЅРµРЅС‚Р°С… `const { t } = useI18n()` Рё РґР°Р»РµРµ `t('namespace.key')`.

### РљР°Рє РґРѕР±Р°РІРёС‚СЊ РЅРѕРІС‹Р№ СЏР·С‹Рє

1. Р”РѕР±Р°РІСЊС‚Рµ С„Р°Р№Р» РІ `locales/<code>.json`.
2. Р’ `nuxt.config.ts` в†’ РІ `locales` РґРѕР±Р°РІСЊС‚Рµ `{ code: '<code>', language: '<bcp47>', name: '<Label>', file: '<code>.json' }`.
3. РџСЂРё РЅРµРѕР±С…РѕРґРёРјРѕСЃС‚Рё РѕР±РЅРѕРІРёС‚Рµ СЃРµР»РµРєС‚РѕСЂ РІ `NavPanel.vue`.

### Acceptance Checklist

- GET `/` в†’ Р°РЅРіР»РёР№СЃРєР°СЏ РІРµСЂСЃРёСЏ Р±РµР· РїСЂРµС„РёРєСЃР°; GET `/ru` в†’ СЂСѓСЃСЃРєР°СЏ РІРµСЂСЃРёСЏ СЃ РїСЂРµС„РёРєСЃРѕРј.
- РџРµСЂРµРєР»СЋС‡Р°С‚РµР»СЊ СЏР·С‹РєР° СЃРѕС…СЂР°РЅСЏРµС‚ С‚РµРєСѓС‰РёР№ РјР°СЂС€СЂСѓС‚ Рё query-РїР°СЂР°РјРµС‚СЂС‹.
- Р’ `<head>/<html>` РєРѕСЂСЂРµРєС‚РЅС‹Рµ `lang`, `dir`, `link[rel=alternate][hreflang]`.
- Р—Р°РіСЂСѓР¶Р°РµС‚СЃСЏ С‚РѕР»СЊРєРѕ Р°РєС‚РёРІРЅР°СЏ Р»РѕРєР°Р»СЊ (+ fallback) РїСЂРё РїРµСЂРІРѕРј Р·Р°С…РѕРґРµ.
- Cookie `i18n_redirected` СѓСЃС‚Р°РЅР°РІР»РёРІР°РµС‚СЃСЏ, СЂРµРґРёСЂРµРєС‚ РІС‹РїРѕР»РЅСЏРµС‚СЃСЏ С‚РѕР»СЊРєРѕ РЅР° РєРѕСЂРЅРµ.