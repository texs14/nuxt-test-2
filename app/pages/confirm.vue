<template>
  <section class="confirm">
    <h1 class="confirm__title">Подтверждение входа</h1>
    <p class="confirm__text">Ожидаем подтверждение сессии…</p>
    <div class="confirm__spinner" aria-hidden="true" />
  </section>
</template>

<script setup lang="ts">
const user = useSupabaseUser()
const redirectInfo = useSupabaseCookieRedirect()

definePageMeta({ requiresAuth: false })

watch(user, () => {
  if (user.value) {
    const path = redirectInfo.pluck()
    return navigateTo(path || '/')
  }
}, { immediate: true })
</script>

<style scoped>
.confirm {
  max-width: 420px;
  margin: 40px auto;
  padding: 24px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  text-align: center;
}

.confirm__title {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 700;
}

.confirm__text {
  margin: 0 0 16px;
  color: #6b7280;
}

.confirm__spinner {
  width: 28px;
  height: 28px;
  margin: 0 auto;
  border: 3px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: confirm__spinner_spin 1s linear infinite;
}

@keyframes confirm__spinner_spin {
  to { transform: rotate(360deg); }
}
</style>
