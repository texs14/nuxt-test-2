// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: [
    '~/assets/styles/layouts/content-page.scss',
    '~/assets/styles/components/buttons.scss',
    '~/assets/styles/components/badges.scss',
  ],
  modules: [
    '@nuxtjs/supabase',
    [
      '@nuxtjs/i18n',
      {
        locales: [
          { code: 'en', language: 'en', name: 'English', file: 'en.json' },
          { code: 'ru', language: 'ru', name: 'Р СѓСЃСЃРєРёР№', file: 'ru.json' },
        ],
        defaultLocale: 'en',
        strategy: 'prefix_except_default',
        detectBrowserLanguage: {
          useCookie: true,
          cookieKey: 'i18n_redirected',
          redirectOn: 'root',
        },
        lazy: true,
        langDir: '../locales',
        baseUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        vueI18n: './i18n.config.ts',
      },
    ],
  ],
  supabase: {
    clientOptions: {
      auth: {
        flowType: 'pkce',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    },
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: [
        '/',
        '/ru/login',
        '/login',
        '/register',
        '/ru/register',
        '/videos',
        '/videos/**',
        '/ru',
        '/ru/videos',
        '/ru/videos/**',
      ],
    },
    cookieOptions: {
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
  },
  runtimeConfig: {
    // СЃРµСЂРІРµСЂРЅС‹Рµ РїСЂРёРІР°С‚РЅС‹Рµ Р·РЅР°С‡РµРЅРёСЏ
    transgate: {
      apiKey: process.env.TRANSGATE_KEY,
    },
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      supabase: {
        url: process.env.SUPABASE_URL,
        key: process.env.SUPABASE_KEY,
      },
    },
  },
});
