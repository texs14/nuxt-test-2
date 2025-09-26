<template>
  <div ref="menuRef" class="user-menu">
    <button
      type="button"
      class="user-menu__trigger"
      :class="{ 'user-menu__trigger_state_open': isOpen }"
      @click="toggleMenu"
      :aria-expanded="isOpen"
    >
      <span class="user-menu__avatar">
        <img
          v-if="avatarUrl"
          :src="avatarUrl"
          :alt="displayName"
          class="user-menu__avatar_image"
        />
        <span v-else class="user-menu__avatar_placeholder">{{ initials }}</span>
      </span>
      <span class="user-menu__info">
        <span class="user-menu__name">{{ displayName }}</span>
        <span v-if="userEmail" class="user-menu__email">{{ userEmail }}</span>
      </span>
      <span class="user-menu__chevron" aria-hidden="true">▾</span>
    </button>

    <div v-if="isOpen" class="user-menu__dropdown">
      <NuxtLink
        :to="localePath({ name: 'profile' })"
        class="user-menu__item user-menu__item_type_link"
        @click="closeMenu"
      >
        {{ t('nav.profile') }}
      </NuxtLink>
      <button
        type="button"
        class="user-menu__item user-menu__item_type_button"
        @click="onLogout"
        :disabled="logoutLoading"
      >
        {{ t('nav.logout') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const localePath = useLocalePath()
const { user, signOut } = useAuth()
const { profile, fetchProfile } = useProfile()

const menuRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const logoutLoading = ref(false)

const userEmail = computed(() => user.value?.email ?? null)

const userMetadata = computed<Record<string, any>>(() => (user.value?.user_metadata as Record<string, any> | undefined) ?? {})

const firstName = computed(() => profile.value?.first_name ?? userMetadata.value?.first_name ?? '')
const lastName = computed(() => profile.value?.last_name ?? userMetadata.value?.last_name ?? '')

const displayName = computed(() => {
  const parts = [firstName.value, lastName.value].filter(Boolean)
  if (parts.length) {
    return parts.join(' ')
  }
  return user.value?.email ?? t('nav.user')
})

const avatarUrl = computed(() => profile.value?.avatar_url ?? userMetadata.value?.avatar_url ?? null)

const initials = computed(() => {
  const source = displayName.value
  if (!source) {
    return '?'
  }
  const words = source.split(' ').filter(Boolean)
  if (!words.length) {
    return source.charAt(0).toUpperCase()
  }
  const first = words[0]
  const second = words[1]
  if (!first) {
    return '?'
  }
  if (second) {
    return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase()
  }
  return first.charAt(0).toUpperCase()
})

function toggleMenu() {
  isOpen.value = !isOpen.value
}

function closeMenu() {
  isOpen.value = false
}

async function onLogout() {
  if (logoutLoading.value) return
  logoutLoading.value = true
  try {
    await signOut()
    closeMenu()
    await router.push(localePath({ name: 'index' }))
  } catch (error) {
    console.error('Logout failed', error)
  } finally {
    logoutLoading.value = false
  }
}

function onDocumentClick(event: MouseEvent) {
  const target = event.target as Node | null
  if (!menuRef.value || !target) return
  if (!menuRef.value.contains(target)) {
    closeMenu()
  }
}

onMounted(async () => {
  if (!profile.value) {
    try {
      await fetchProfile()
    } catch (error) {
      console.error('Profile fetch failed', error)
    }
  }
  document.addEventListener('click', onDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
})

watch(
  () => route.fullPath,
  () => {
    closeMenu()
  }
)
</script>

<style scoped lang="scss">
.user-menu {
  position: relative;

  &__trigger {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 9999px;
    background-color: #ffffff;
    cursor: pointer;
    transition: background-color 0.2s ease, box-shadow 0.2s ease;

    &:hover {
      background-color: #f3f4f6;
    }

    &:focus-visible {
      outline: 2px solid #2563eb;
      outline-offset: 2px;
    }

    &_state_open {
      box-shadow: 0 2px 12px rgba(15, 23, 42, 0.12);
    }
  }

  &__avatar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: #e2e8f0;
    overflow: hidden;
    flex-shrink: 0;

    &_image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    &_placeholder {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      font-weight: 600;
      color: #1f2937;
    }
  }

  &__info {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    min-width: 0;
  }

  &__name {
    font-weight: 600;
    color: #111827;
    line-height: 1.2;
    max-width: 160px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__email {
    font-size: 12px;
    color: #6b7280;
    line-height: 1.2;
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__chevron {
    font-size: 16px;
    color: #6b7280;
  }

  &__dropdown {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    min-width: 180px;
    background-color: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
    padding: 0.5rem 0;
    z-index: 20;
  }

  &__item {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 0.5rem 1rem;
    background: none;
    border: none;
    font-size: 14px;
    color: #1f2937;
    text-decoration: none;
    cursor: pointer;
    transition: background-color 0.2s ease;

    &:hover {
      background-color: #f9fafb;
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    &_type_link {
      justify-content: flex-start;
    }

    &_type_button {
      justify-content: flex-start;
      color: #b91c1c;
    }
  }
}
</style>
