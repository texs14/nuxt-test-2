<template>
  <form class="auth-register" @submit.prevent="onSubmit">
    <div class="auth-register__field">
      <UiInput
        v-model="first_name"
        label="Имя*"
        name="first_name"
        required
      />
    </div>

    <div class="auth-register__field">
      <UiInput
        v-model="age"
        label="Возраст*"
        name="age"
        type="number"
        min="1"
        max="150"
        required
        inputmode="numeric"
      />
    </div>

    <div class="auth-register__field">
      <UiInput
        v-model="email"
        label="E-mail*"
        name="email"
        type="email"
        autocomplete="email"
        required
      />
    </div>

    <div class="auth-register__field">
      <UiInput
        v-model="password"
        label="Пароль*"
        name="password"
        type="password"
        autocomplete="new-password"
        required
      />
    </div>

    <div class="auth-register__field">
      <UiInput
        v-model="last_name"
        label="Фамилия"
        name="last_name"
      />
    </div>

    <div class="auth-register__field">
      <UiInput
        v-model="username"
        label="Username"
        name="username"
        @blur="checkUsername"
      />
      <p v-if="usernameStatus && usernameStatus.type==='ok'" class="auth-register__status auth-register__status_success">{{ usernameStatus.text }}</p>
      <p v-if="usernameStatus && usernameStatus.type==='err'" class="auth-register__status auth-register__status_error">{{ usernameStatus.text }}</p>
    </div>

    <div class="auth-register__field">
      <UiInput
        v-model="avatar_url"
        label="Avatar URL"
        name="avatar_url"
        type="url"
        placeholder="https://..."
      />
    </div>

    <div class="auth-register__field">
      <UiInput
        v-model="city"
        label="Город"
        name="city"
      />
    </div>

    <div class="auth-register__actions">
      <button class="auth-register__submit" type="submit" :disabled="loading">Зарегистрироваться</button>
    </div>

    <p v-if="message" class="auth-register__status auth-register__status_success">{{ message }}</p>
    <p v-if="errorMessage" class="auth-register__status auth-register__status_error">{{ errorMessage }}</p>
  </form>
</template>

<script setup lang="ts">
const route = useRoute()
const redirectInfo = useSupabaseCookieRedirect()
const { signUpEmail } = useAuth()

const first_name = ref('')
const age = ref<number | null>(null)
const email = ref('')
const password = ref('')
const last_name = ref('')
const username = ref('')
const avatar_url = ref('')
const city = ref('')

const loading = ref(false)
const message = ref('')
const errorMessage = ref('')

const usernameStatus = ref<{ type: 'ok'|'err', text: string } | null>(null)

onMounted(() => {
  const redirect = route.query.redirect
  if (typeof redirect === 'string' && redirect) {
    try { redirectInfo.path.value = decodeURIComponent(redirect) } catch { /* noop */ }
  }
})

async function checkUsername() {
  usernameStatus.value = null
  const u = username.value?.trim()
  if (!u) return
  try {
    const { available } = await $fetch<{ available: boolean }>(`/api/profile/username-available?u=${encodeURIComponent(u)}`)
    usernameStatus.value = available
      ? { type: 'ok', text: 'Имя пользователя свободно' }
      : { type: 'err', text: 'Имя пользователя занято' }
  } catch (e) {
    // игнорируем сетевые ошибки для простоты
  }
}

const onSubmit = async () => {
  errorMessage.value = ''
  message.value = ''
  loading.value = true
  try {
    if (age.value == null) throw createError({ statusCode: 400, statusMessage: 'Укажите возраст' })
    await signUpEmail({
      email: email.value,
      password: password.value,
      age: age.value,
      first_name: first_name.value,
      last_name: last_name.value || undefined,
      username: username.value || undefined,
      avatar_url: avatar_url.value || undefined,
      city: city.value || undefined
    })
    message.value = 'Проверьте почту и перейдите по ссылке для входа'
  } catch (err: any) {
    errorMessage.value = err?.statusMessage || err?.message || 'Ошибка регистрации'
  } finally {
    loading.value = false
  }
}
</script>


<style lang="scss" scoped>
.auth-register {
  width: 50% ;

  margin: auto;

  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>