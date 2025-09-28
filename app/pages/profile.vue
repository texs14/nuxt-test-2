<template>
  <div class="profile-page">
    <div class="profile-page__container">
      <h1 class="profile-page__title">{{ t('profile.title') }}</h1>
      <ProfileDetails :profile="profile" :loading="loading" :error="errorMessage" />
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
  requiresAuth: true,
});

const { t } = useI18n();
const { profile, fetchProfile } = useProfile();

const { pending, error } = await useAsyncData('profile-current', fetchProfile);

const loading = computed(() => pending.value);

const errorMessage = computed(() => {
  if (!error.value) {
    return null;
  }

  const cause = (error.value as { data?: Record<string, unknown>; message?: string }).data;
  const statusMessage = typeof cause?.statusMessage === 'string' ? cause.statusMessage : null;
  return statusMessage ?? error.value.message ?? t('profile.error');
});
</script>

<style scoped lang="scss">
.profile-page {
  width: 100%;
  display: flex;
  justify-content: center;

  &__container {
    width: min(960px, 100%);
    padding: 2rem 1.5rem 3rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  &__title {
    margin: 0;
    font-size: 2rem;
    font-weight: 700;
    color: #0f172a;
  }
}
</style>
