# Changelog

## 2025-09-22

- feat(i18n): РґРѕР±Р°РІР»РµРЅ РјРѕРґСѓР»СЊ `@nuxtjs/i18n@10.1.0`.
- config(i18n):
  - `locales`: `en` (default), `ru` (Р»РµРЅРёРІР°СЏ Р·Р°РіСЂСѓР·РєР° РёР· `locales/`).
  - `strategy`: `prefix_except_default` (Р±РµР· РїСЂРµС„РёРєСЃР° РґР»СЏ en, `/ru` РґР»СЏ RU).
  - `detectBrowserLanguage`: cookie `i18n_redirected`, `redirectOn: 'root'`.
  - `vueI18n`: РІС‹РЅРµСЃРµРЅРѕ РІ `i18n.config.ts` (`legacy: false`, `fallbackLocale: 'en'`).
- seo: РіР»РѕР±Р°Р»СЊРЅРѕ РїРѕРґРєР»СЋС‡С‘РЅ `useLocaleHead({ addDirAttribute: true, addSeoAttributes: true })` РІ `app/app.vue` (РіРµРЅРµСЂР°С†РёСЏ `<html lang/dir>`, `hreflang`, `canonical`).
- translations: СЃРѕР·РґР°РЅР° РїР°РїРєР° `locales/` СЃ `en.json`, `ru.json` (Р±Р°Р·РѕРІС‹Рµ РєР»СЋС‡Рё `app.*`, `nav.*`, `lang.*`, `videos.*`).
- navigation: РґРѕР±Р°РІР»РµРЅ РЅР°С‚РёРІРЅС‹Р№ РїРµСЂРµРєР»СЋС‡Р°С‚РµР»СЊ СЏР·С‹РєР° РІ `app/components/NavPanel.vue` (label + select, `useSwitchLocalePath`); РІСЃРµ СЃСЃС‹Р»РєРё РїРµСЂРµРІРµРґРµРЅС‹ РЅР° `useLocalePath`.
- routes: СЃСЃС‹Р»РєРё РЅР° РІРёРґРµРѕ Рё РґРѕР±Р°РІР»РµРЅРёРµ РІРёРґРµРѕ Р»РѕРєР°Р»РёР·РѕРІР°РЅС‹ РІ `VideoCard.vue`, `app/pages/videos/index.vue`.
- docs: РѕР±РЅРѕРІР»С‘РЅ `README.md` СЂР°Р·РґРµР»РѕРј РїСЂРѕ i18n.
