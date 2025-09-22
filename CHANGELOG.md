# Changelog

## 2025-09-22

- feat(i18n): добавлен модуль `@nuxtjs/i18n@10.1.0`.
- config(i18n):
  - `locales`: `en` (default), `ru` (ленивая загрузка из `locales/`).
  - `strategy`: `prefix_except_default` (без префикса для en, `/ru` для RU).
  - `detectBrowserLanguage`: cookie `i18n_redirected`, `redirectOn: 'root'`.
  - `vueI18n`: вынесено в `i18n.config.ts` (`legacy: false`, `fallbackLocale: 'en'`).
- seo: глобально подключён `useLocaleHead({ addDirAttribute: true, addSeoAttributes: true })` в `app/app.vue` (генерация `<html lang/dir>`, `hreflang`, `canonical`).
- translations: создана папка `locales/` с `en.json`, `ru.json` (базовые ключи `app.*`, `nav.*`, `lang.*`, `videos.*`).
- navigation: добавлен нативный переключатель языка в `app/components/NavPanel.vue` (label + select, `useSwitchLocalePath`); все ссылки переведены на `useLocalePath`.
- routes: ссылки на видео и добавление видео локализованы в `VideoCard.vue`, `app/pages/videos/index.vue`.
- docs: обновлён `README.md` разделом про i18n.
