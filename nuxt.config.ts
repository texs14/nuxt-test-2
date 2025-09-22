// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from 'node:url'
import { dirname, resolve as resolvePath } from 'node:path'

const __root = dirname(fileURLToPath(import.meta.url))
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: [
    '@nuxtjs/supabase',
    ['@nuxtjs/i18n', {
      locales: [
        { code: 'en', language: 'en', name: 'English', file: 'en.json' },
        { code: 'ru', language: 'ru', name: 'Русский', file: 'ru.json' }
      ],
      defaultLocale: 'en',
      strategy: 'prefix_except_default',
      detectBrowserLanguage: {
        useCookie: true,
        cookieKey: 'i18n_redirected',
        redirectOn: 'root'
      },
      lazy: true,
      langDir: resolvePath(__root, 'locales'),
      vueI18n: './i18n.config.ts'
    }]
  ],
  supabase: {
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/', '/videos' , '/videos/**', '/ru', '/ru/videos', '/ru/videos/**']
    }
  },
  runtimeConfig: {
    // серверные приватные значения
    transgate: {
      apiKey: process.env.TRANSGATE_KEY
    },
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    public: {
      supabase: {
        url: process.env.SUPABASE_URL,
        key: process.env.SUPABASE_KEY
      }
    }
  }
})