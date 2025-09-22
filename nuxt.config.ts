// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/supabase'],
  supabase: {
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/', '/videos' , '/videos/**']
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