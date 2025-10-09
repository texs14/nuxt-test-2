<template>
  <div ref="container" class="language-switcher">
    <button
      type="button"
      class="language-switcher__button"
      :aria-expanded="isOpen"
      aria-haspopup="listbox"
      @click="toggleDropdown"
    >
      <span class="language-switcher__flag" :class="currentLanguage.flagClass"></span>
      <span class="language-switcher__code">{{ currentLanguage.code.toUpperCase() }}</span>
      <ChevronIcon class="language-switcher__icon" :open="isOpen" />
    </button>

    <transition name="language-switcher-dropdown">
      <ul
        v-if="isOpen"
        class="language-switcher__list"
        role="listbox"
        :aria-activedescendant="`language-switcher-option-${currentLanguage.code}`"
      >
        <li
          v-for="lang in languages"
          :id="`language-switcher-option-${lang.code}`"
          :key="lang.code"
          class="language-switcher__option"
          role="option"
          :class="{ 'language-switcher__option_active': lang.code === currentCode }"
          :aria-selected="lang.code === currentCode"
        >
          <button
            type="button"
            class="language-switcher__option-button"
            @click="selectLanguage(lang.code)"
          >
            <span class="language-switcher__flag" :class="lang.flagClass"></span>
            <span class="language-switcher__label">{{ lang.label }}</span>
          </button>
        </li>
      </ul>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from '#imports';
import ChevronIcon from '~/components/ui/icons/ChevronIcon.vue';

type LanguageCode = 'en' | 'ru';

interface LanguageOption {
  code: LanguageCode;
  label: string;
  flagClass: string;
}

const { t, locale } = useI18n();
const switchLocalePath = useSwitchLocalePath();
const router = useRouter();
const isOpen = ref(false);
const container = ref<HTMLDivElement | null>(null);

const baseLanguages: Omit<LanguageOption, 'label'>[] = [
  {
    code: 'en',
    flagClass: 'language-switcher__flag_en',
  },
  {
    code: 'ru',
    flagClass: 'language-switcher__flag_ru',
  },
];

const languages = computed<LanguageOption[]>(() =>
  baseLanguages.map((item) => ({
    ...item,
    label: item.code === 'en' ? t('lang.english') : t('lang.russian'),
  }))
);

const currentCode = computed<LanguageCode>(() => {
  const code = locale.value as LanguageCode;
  return code === 'en' || code === 'ru' ? code : 'en';
});

const currentLanguage = computed<LanguageOption>(() => {
  const match = languages.value.find((item) => item.code === currentCode.value);
  if (match) {
    return match;
  }

  return (
    languages.value[0] ?? {
      code: 'en',
      label: t('lang.english'),
      flagClass: 'language-switcher__flag_en',
    }
  );
});

function toggleDropdown() {
  isOpen.value = !isOpen.value;
}

function closeDropdown() {
  isOpen.value = false;
}

async function selectLanguage(code: LanguageCode) {
  if (code === locale.value) {
    closeDropdown();
    return;
  }

  const path = switchLocalePath(code);
  if (path) {
    await router.push(path);
  }

  closeDropdown();
}

function handleClickOutside(event: MouseEvent) {
  if (!container.value) return;
  if (!(event.target instanceof Node)) return;
  if (!container.value.contains(event.target)) {
    closeDropdown();
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
});

watch(
  () => locale.value,
  () => {
    closeDropdown();
  }
);
</script>

<style scoped lang="scss">
.language-switcher {
  position: relative;
  display: inline-block;

  &__button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    border: 1px solid rgba(203, 213, 225, 1);
    background-color: #ffffff;
    color: #0f172a;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
    transition:
      background-color 0.2s ease,
      color 0.2s ease,
      border-color 0.2s ease;

    &:hover {
      background-color: #f8fafc;
    }

    &:focus-visible {
      outline: none;
      border-color: #1173d4;
      box-shadow: 0 0 0 2px rgba(17, 115, 212, 0.35);
    }
  }

  &__flag {
    width: 1.3333em;
    height: 1em;
    border-radius: 0.125em;
    background-size: cover;
    background-position: center;
    display: inline-block;
  }

  &__flag_en {
    background-image: url('https://cdn.jsdelivr.net/gh/lipis/flag-icons@7/flags/4x3/gb.svg');
  }

  &__flag_ru {
    background-image: url('https://cdn.jsdelivr.net/gh/lipis/flag-icons@7/flags/4x3/ru.svg');
  }

  &__code {
    font-weight: 600;
    text-transform: uppercase;
    color: #0f172a;
  }

  &__icon {
    width: 1rem;
    height: 1rem;
    color: #94a3b8;
    transition: transform 0.2s ease;

    &_open {
      transform: rotate(180deg);
    }
  }

  &__list {
    position: absolute;
    right: 0;
    margin-top: 0.5rem;
    width: 10rem;
    border-radius: 0.5rem;
    background-color: #ffffff;
    box-shadow: 0 10px 30px rgba(15, 23, 42, 0.1);
    border: 1px solid rgba(15, 23, 42, 0.05);
    padding: 0.5rem 0;
    z-index: 10;
  }

  &__option {
    list-style: none;

    &_active .language-switcher__option-button {
      background-color: #e2e8f0;
      color: #0f172a;
    }
  }

  &__option-button {
    width: 100%;
    padding: 0.5rem 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    border: none;
    background: transparent;
    color: #475569;
    font-size: 0.875rem;
    cursor: pointer;
    transition:
      background-color 0.2s ease,
      color 0.2s ease;

    &:hover {
      background-color: #f1f5f9;
      color: #0f172a;
    }

    &:focus-visible {
      outline: none;
      background-color: #e2e8f0;
    }
  }

  &__label {
    font-weight: 500;
  }
}

.language-switcher-dropdown-enter-active,
.language-switcher-dropdown-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.language-switcher-dropdown-enter-from,
.language-switcher-dropdown-leave-to {
  opacity: 0;
  transform: translateY(-0.25rem);
}
</style>
