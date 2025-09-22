<template>
  <section class="login">
    <h1 class="login__title">Вход по e‑mail</h1>

    <form class="login__form" @submit.prevent="signInWithOtp">
      <label class="login__field">
        <span class="login__label">E‑mail</span>
        <input
          v-model="email"
          class="login__input"
          type="email"
          placeholder="you@example.com"
          required
        />
      </label>

      <button class="login__submit" type="submit" :disabled="loading">
        <span v-if="!loading">Отправить ссылку для входа</span>
        <span v-else>Отправка…</span>
      </button>

      <p v-if="message" class="login__status login__status_success">{{ message }}</p>
      <p v-if="errorMessage" class="login__status login__status_error">{{ errorMessage }}</p>
      <p class="login__note">После нажатия проверьте почту и перейдите по ссылке. Мы вернём вас на страницу подтверждения.</p>
    </form>
  </section>
</template>

<script setup lang="ts">
const supabase = useSupabaseClient()
const email = ref('')
const loading = ref(false)
const message = ref('')
const errorMessage = ref('')

definePageMeta({ requiresAuth: false })

const signInWithOtp = async () => {
  message.value = ''
  errorMessage.value = ''
  loading.value = true
  try {
    const callbackUrl = `${window.location.origin}/confirm`
    const { error } = await supabase.auth.signInWithOtp({
      email: email.value,
      options: {
        emailRedirectTo: callbackUrl,
      },
    })
    if (error) throw error
    message.value = 'Письмо отправлено. Проверьте почту.'
  } catch (err: any) {
    errorMessage.value = err?.message || 'Не удалось отправить письмо. Попробуйте ещё раз.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login {
  max-width: 420px;
  margin: 40px auto;
  padding: 24px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
}

.login__title {
  margin: 0 0 16px;
  font-size: 20px;
  font-weight: 700;
}

.login__form {
  display: grid;
  gap: 12px;
}

.login__field {
  display: grid;
  gap: 6px;
}

.login__label {
  font-size: 14px;
  color: #374151;
}

.login__input {
  height: 40px;
  padding: 0 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  outline: none;
}

.login__input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.login__submit {
  height: 40px;
  border: none;
  border-radius: 8px;
  background: #3b82f6;
  color: #fff;
  cursor: pointer;
}

.login__submit:disabled {
  opacity: 0.6;
  cursor: default;
}

.login__note {
  margin-top: 8px;
  font-size: 12px;
  color: #6b7280;
}

.login__status {
  margin: 0;
  font-size: 14px;
}

.login__status_success {
  color: #10b981;
}

.login__status_error {
  color: #ef4444;
}
</style>
