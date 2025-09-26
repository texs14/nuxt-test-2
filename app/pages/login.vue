<template>
  <AuthLoginForm />
  <!-- Авто-запуск OAuth по query ?provider=google сохраняется -->
</template>

<script setup lang="ts">
definePageMeta({ requiresAuth: false })

const route = useRoute()
const user = useSupabaseUser()
const redirectInfo = useSupabaseCookieRedirect()
const { signInWithGoogleOAuth } = useAuth()

onMounted(async () => {
  // Сохраняем желаемый редирект в cookie, если передан через query
  const redirect = route.query.redirect
  if (typeof redirect === 'string' && redirect) {
    try { redirectInfo.path.value = decodeURIComponent(redirect) } catch { /* noop */ }
  }

  // Если уже авторизованы — сразу вернуть на сохранённый путь
  if (user.value) {
    const path = redirectInfo.pluck()
    return navigateTo(path || '/')
  }

  // Запуск OAuth (Google, PKCE) при явном указании провайдера
  const provider = route.query.provider
  if (provider === 'google') {
    try {
      await signInWithGoogleOAuth()
    } catch (e) {
      // В случае ошибки вернём на корень с параметром
      return navigateTo('/?auth_error=oauth')
    }
  }
})
</script>
