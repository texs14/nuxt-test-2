<template>
  <nav class="navigation">
    <ul class="navigation__list">
      <li class="navigation__item">
        <NuxtLink :to="safeLocalePath({ name: 'index' })" class="navigation__link">{{
          t('nav.home')
        }}</NuxtLink>
      </li>
      <li class="navigation__item">
        <NuxtLink :to="safeLocalePath({ name: 'about' })" class="navigation__link">{{
          t('nav.about')
        }}</NuxtLink>
      </li>
      <li class="navigation__item">
        <NuxtLink :to="safeLocalePath({ name: 'videos' })" class="navigation__link">{{
          t('nav.videos')
        }}</NuxtLink>
      </li>
    </ul>

    <div class="navigation__actions">
      <div class="navigation__lang">
        <label :for="langSelectId" class="navigation__lang_label">{{ t('lang.select') }}</label>
        <select
          :id="langSelectId"
          class="navigation__lang_select"
          :aria-label="t('lang.select')"
          :value="locale"
          @change="onChange"
        >
          <option value="en">{{ t('lang.english') }}</option>
          <option value="ru">{{ t('lang.russian') }}</option>
        </select>
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
import { useRouter } from '#imports';

const { t, locale } = useI18n();
const switchLocalePath = useSwitchLocalePath();
const safeLocalePath = useSafeLocalePath();
const router = useRouter();
const langSelectId = 'lang-select';
const { user } = useAuth();
const isAuthenticated = computed(() => Boolean(user.value));

function onChange(e: Event) {
  const target = e.target as HTMLSelectElement;
  const code = target.value as 'en' | 'ru';
  const path = switchLocalePath(code);
  if (path) router.push(path);
}
</script>

<style lang="scss" scoped>
.navigation {
  display: flex;
  align-items: center;
  gap: 1rem;

  &__list {
    display: flex;
    gap: 1rem;

    list-style: none;
  }

  &__item {
    padding: 12px 16px;
  }

  &__link {
    color: black;

    text-decoration: none;

    &:open {
      color: black;
    }
  }

  &__actions {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: 1rem;
  }

  &__lang {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;

    &_label {
      font-size: 14px;
    }

    &_select {
      padding: 4px 8px;
      border-radius: 6px;
      border: 1px solid #ccc;
      background: #fff;
    }
  }

  &__button {
    padding: 8px 12px;
    border-radius: 6px;
    border: 1px solid #ccc;
    background-color: #fff;
    cursor: pointer;
    transition: background-color 0.2s ease;

    &_login {
      color: #2563eb;
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    &:hover:not(:disabled) {
      background-color: rgba(0, 0, 0, 0.05);
    }
  }
}
</style>
