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
      <UIButton type="submit" :loading="loading" :disabled="loading" block>
        {{ t('auth.login.submit') }}
      </UIButton>
      <!-- 
      <UIButton
        variant="google"
        type="button"
        :loading="loading"
        :disabled="loading"
        block
        @click="signInGoogle"
      >
        {{ t('auth.login.google') }}
      </UIButton> -->

      <UIButton v-if="registerLink !== '#'" variant="ghost" :to="registerLink" size="sm">
        {{ t('auth.login.register') }}
      </UIButton>
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
  gap: 0.75rem;
  align-items: center;
}
</style>
