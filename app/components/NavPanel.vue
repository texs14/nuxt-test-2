<template>
  <nav class="navigation">
    <ul class="navigation__list">
      <li class="navigation__item">
        <NuxtLink :to="safeLocalePath({ name: 'index' })" class="navigation__link">{{
          t('nav.home')
        }}</NuxtLink>
      </li>
      <li class="navigation__item">
        <NuxtLink :to="safeLocalePath({ name: 'videos' })" class="navigation__link">{{
          t('nav.videos')
        }}</NuxtLink>
      </li>
      <li class="navigation__item">
        <NuxtLink :to="safeLocalePath({ name: 'lessons' })" class="navigation__link">{{
          t('nav.lessons')
        }}</NuxtLink>
      </li>
      <li v-if="isAuthenticated" class="navigation__item">
        <NuxtLink :to="safeLocalePath({ name: 'vocabulary' })" class="navigation__link">{{
          t('nav.vocabulary')
        }}</NuxtLink>
      </li>
    </ul>

    <div class="navigation__actions">
      <div class="navigation__lang">
        <LanguageSelector />
      </div>

      <NuxtLink
        v-if="!isAuthenticated"
        :to="safeLocalePath({ name: 'login' })"
        class="navigation__button navigation__button_login"
      >
        {{ t('nav.login') }}
      </NuxtLink>

      <UserMenu v-else />
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import LanguageSelector from './LanguageSelector.vue';

const { t } = useI18n();
const safeLocalePath = useSafeLocalePath();
const { user } = useAuth();
const isAuthenticated = computed(() => Boolean(user.value));
</script>

<style lang="scss" scoped>
.navigation {
  display: flex;
  align-items: center;
  gap: 2rem;

  &__list {
    display: none;
    list-style: none;
    margin: 0;
    padding: 0;

    @media (min-width: 768px) {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }
  }

  &__item {
    padding: 0;
  }

  &__link {
    font-size: 0.875rem;
    font-weight: 500;
    color: rgb(71 85 105);
    text-decoration: none;
    transition: color 0.2s ease;

    &:hover {
      color: #13a4ec;
    }

    &.router-link-active {
      color: #13a4ec;
    }
  }

  &__actions {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: 1rem;
  }

  &__lang {
    display: none;
    align-items: center;
    gap: 0.5rem;

    @media (min-width: 768px) {
      display: inline-flex;
    }
  }

  &__button {
    padding: 0.625rem 1rem;
    border-radius: 0.5rem;
    border: none;
    background-color: #13a4ec;
    color: white;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background-color 0.2s ease;
    text-decoration: none;

    @media (min-width: 640px) {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    &_login {
      color: white;
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    &:hover:not(:disabled) {
      background-color: rgba(19, 164, 236, 0.9);
    }
  }
}
</style>
