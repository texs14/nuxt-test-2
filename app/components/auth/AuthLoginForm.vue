<!-- eslint-disable prettier/prettier -->
<template>
  <form class="auth-login" @submit.prevent="onSubmit">
    <div class="auth-login__field">
      <UiInput
        v-model="email"
        :label="t('auth.login.email')"
        name="email"
        type="email"
        autocomplete="email"
        required
      />
    </div>

    <div class="auth-login__field">
      <UiInput
        v-model="password"
        :label="t('auth.login.password')"
        name="password"
        type="password"
        autocomplete="current-password"
        required
      />
    </div>

    <div class="auth-login__actions">
      <button class="auth-login__submit" type="submit" :disabled="loading">
        {{ t('auth.login.submit') }}
      </button>
      <button
        class="auth-login__submit auth-login__submit_google"
        type="button"
        :disabled="loading"
        @click="signInGoogle"
      >
        {{ t('auth.login.google') }}
      </button>
      <NuxtLink v-if="registerLink !== '#'" class="auth-login__link" :to="registerLink">{{
        t('auth.login.register')
      }}</NuxtLink>
    </div>

    <p v-if="message" class="auth-login__status auth-login__status_success">{{ message }}</p>
    <p v-if="errorMessage" class="auth-login__status auth-login__status_error">
      {{ errorMessage }}
    </p>
  </form>
</template>

<script setup lang="ts">
const { t } = useI18n();
const safeLocalePath = useSafeLocalePath();

const registerLink = computed(() => safeLocalePath('/register'));

const email = ref('');
const password = ref('');
const loading = ref(false);
const message = ref('');
const errorMessage = ref('');

const redirectInfo = useSupabaseCookieRedirect();
const { signInWithPassword, signInWithGoogleOAuth } = useAuth();

const onSubmit = async () => {
  errorMessage.value = '';
  message.value = '';
  loading.value = true;
  try {
    await signInWithPassword(email.value, password.value);
    const path = redirectInfo.pluck();
    return navigateTo(path || '/');
  } catch (err: any) {
    errorMessage.value = err?.statusMessage || err?.message || 'РћС€РёР±РєР° РІС…РѕРґР°';
  } finally {
    loading.value = false;
  }
};

const signInGoogle = async () => {
  errorMessage.value = '';
  try {
    await signInWithGoogleOAuth();
  } catch (err: any) {
    errorMessage.value = err?.statusMessage || err?.message || 'РћС€РёР±РєР° OAuth';
  }
};
</script>

<style lang="scss" scoped>
.auth-login {
  width: 50%;

  margin: auto;

  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.auth-login__actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.auth-login__link {
  align-self: center;
  color: var(--color-primary, #2563eb);
  font-weight: 500;
  text-decoration: none;
}

.auth-login__link:hover {
  text-decoration: underline;
}
</style>
