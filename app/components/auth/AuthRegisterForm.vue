<!-- eslint-disable camelcase -->
<template>
  <form class="auth-register" @submit.prevent="onSubmit">
    <div class="auth-register__field">
      <UiInput v-model="first_name" :label="t('register.firstName')" name="first_name" required />
    </div>

    <div class="auth-register__field">
      <UiInput
        v-model="age"
        :label="t('register.age')"
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
        :label="t('register.email')"
        name="email"
        type="email"
        autocomplete="email"
        required
      />
    </div>

    <div class="auth-register__field">
      <UiInput
        v-model="password"
        :label="t('register.password')"
        name="password"
        type="password"
        autocomplete="new-password"
        required
      />
    </div>

    <div class="auth-register__field">
      <UiInput v-model="last_name" :label="t('register.lastName')" name="last_name" />
    </div>

    <div class="auth-register__field">
      <UiInput
        v-model="username"
        :label="t('register.username')"
        name="username"
        @blur="checkUsername"
      />
      <p
        v-if="usernameStatus && usernameStatus.type === 'ok'"
        class="auth-register__status auth-register__status_success"
      >
        {{ t('register.usernameAvailable') }}
      </p>
      <p
        v-if="usernameStatus && usernameStatus.type === 'err'"
        class="auth-register__status auth-register__status_error"
      >
        {{ t('register.usernameTaken') }}
      </p>
    </div>

    <div class="auth-register__field">
      <UiInput
        v-model="avatar_url"
        :label="t('register.avatarUrl')"
        name="avatar_url"
        type="url"
        placeholder="https://..."
      />
    </div>

    <div class="auth-register__field">
      <UiInput v-model="city" :label="t('register.city')" name="city" />
    </div>

    <div class="auth-register__actions">
      <button class="auth-register__submit" type="submit" :disabled="loading">
        {{ t('register.submit') }}
      </button>
    </div>

    <p v-if="message" class="auth-register__status auth-register__status_success">{{ message }}</p>
    <p v-if="errorMessage" class="auth-register__status auth-register__status_error">
      {{ errorMessage }}
    </p>
  </form>
</template>

<script setup lang="ts">
const { t } = useI18n();
const route = useRoute();
const redirectInfo = useSupabaseCookieRedirect();
const { signUpEmail } = useAuth();

// eslint-disable-next-line camelcase
const first_name = ref('');
const age = ref<number | null>(null);
const email = ref('');
const password = ref('');
// eslint-disable-next-line camelcase
const last_name = ref('');
const username = ref('');
// eslint-disable-next-line camelcase
const avatar_url = ref('');
const city = ref('');

const loading = ref(false);
const message = ref('');
const errorMessage = ref('');

const usernameStatus = ref<{ type: 'ok' | 'err' } | null>(null);

onMounted(() => {
  const redirect = route.query.redirect;
  if (typeof redirect === 'string' && redirect) {
    try {
      redirectInfo.path.value = decodeURIComponent(redirect);
    } catch {
      /* noop */
    }
  }
});

async function checkUsername() {
  usernameStatus.value = null;
  const u = username.value?.trim();
  if (!u) return;
  try {
    const { available } = await $fetch<{ available: boolean }>(
      `/api/profile/username-available?u=${encodeURIComponent(u)}`
    );
    usernameStatus.value = available ? { type: 'ok' } : { type: 'err' };
  } catch (e) {
    // Ignore network errors
  }
}

const onSubmit = async () => {
  errorMessage.value = '';
  message.value = '';
  loading.value = true;
  try {
    if (age.value == null)
      throw createError({ statusCode: 400, statusMessage: t('register.ageRequired') });
    await signUpEmail({
      email: email.value,
      password: password.value,
      age: age.value,
      // eslint-disable-next-line camelcase
      first_name: first_name.value,
      // eslint-disable-next-line camelcase
      last_name: last_name.value || undefined,
      username: username.value || undefined,
      // eslint-disable-next-line camelcase
      avatar_url: avatar_url.value || undefined,
      city: city.value || undefined,
    });
    message.value = t('register.checkEmail');
  } catch (err: any) {
    errorMessage.value = err?.statusMessage || err?.message || t('register.error');
  } finally {
    loading.value = false;
  }
};
</script>

<style lang="scss" scoped>
.auth-register {
  width: 50%;

  margin: auto;

  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
