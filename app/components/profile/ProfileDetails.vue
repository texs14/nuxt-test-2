<template>
  <section class="profile-details">
    <div v-if="loading" class="profile-details__status profile-details__status_loading">
      <span class="profile-details__spinner" aria-hidden="true" />
      <span class="profile-details__status-text">{{ t('profile.loading') }}</span>
    </div>

    <div v-else-if="error" class="profile-details__status profile-details__status_error">
      <span class="profile-details__status-text">{{ error }}</span>
    </div>

    <div v-else-if="!profile" class="profile-details__status profile-details__status_empty">
      <span class="profile-details__status-text">{{ t('profile.empty') }}</span>
    </div>

    <div v-else class="profile-details__content">
      <header class="profile-details__header">
        <div class="profile-details__avatar-wrap">
          <img
            v-if="profile.avatar_url"
            :src="profile.avatar_url"
            alt=""
            class="profile-details__avatar"
            loading="lazy"
          />
          <span v-else class="profile-details__avatar profile-details__avatar_placeholder">
            {{ initials }}
          </span>
        </div>

        <div class="profile-details__identity">
          <h2 class="profile-details__name">{{ fullName }}</h2>
          <p class="profile-details__email">{{ profile.email }}</p>
        </div>
      </header>

      <ul class="profile-details__list">
        <li class="profile-details__item">
          <span class="profile-details__label">{{ t('profile.fields.id') }}</span>
          <span class="profile-details__value">{{ profile.id }}</span>
        </li>
        <li class="profile-details__item">
          <span class="profile-details__label">{{ t('profile.fields.username') }}</span>
          <span class="profile-details__value">{{ profile.username || placeholder }}</span>
        </li>
        <li class="profile-details__item">
          <span class="profile-details__label">{{ t('profile.fields.firstName') }}</span>
          <span class="profile-details__value">{{ profile.first_name || placeholder }}</span>
        </li>
        <li class="profile-details__item">
          <span class="profile-details__label">{{ t('profile.fields.lastName') }}</span>
          <span class="profile-details__value">{{ profile.last_name || placeholder }}</span>
        </li>
        <li class="profile-details__item">
          <span class="profile-details__label">{{ t('profile.fields.age') }}</span>
          <span class="profile-details__value">{{ profile.age ?? placeholder }}</span>
        </li>
        <li class="profile-details__item">
          <span class="profile-details__label">{{ t('profile.fields.city') }}</span>
          <span class="profile-details__value">{{ profile.city || placeholder }}</span>
        </li>
        <li class="profile-details__item">
          <span class="profile-details__label">{{ t('profile.fields.createdAt') }}</span>
          <span class="profile-details__value">{{ formattedCreatedAt }}</span>
        </li>
        <li class="profile-details__item">
          <span class="profile-details__label">{{ t('profile.fields.updatedAt') }}</span>
          <span class="profile-details__value">{{ formattedUpdatedAt }}</span>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { Database } from '~~/types/supabase'

const props = defineProps<{
  profile: Database['public']['Tables']['profiles']['Row'] | null
  loading: boolean
  error: string | null
}>()

const { t, locale } = useI18n()

const placeholder = computed(() => t('profile.notSpecified'))

const fullName = computed(() => {
  if (!props.profile) {
    return placeholder.value
  }
  const first = props.profile.first_name?.trim() || ''
  const last = props.profile.last_name?.trim() || ''
  const combined = [first, last].filter(Boolean).join(' ')
  if (combined) {
    return combined
  }
  if (props.profile.username) {
    return props.profile.username
  }
  return props.profile.email
})

const initials = computed(() => {
  if (!props.profile) {
    return ''
  }
  const firstLetter = props.profile.first_name?.trim()?.[0]
  const lastLetter = props.profile.last_name?.trim()?.[0]
  const base = [firstLetter, lastLetter].filter(Boolean).join('')
  if (base) {
    return base.toUpperCase()
  }
  if (props.profile.username) {
    return props.profile.username.slice(0, 2).toUpperCase()
  }
  return props.profile.email.slice(0, 2).toUpperCase()
})

function formatDate(value: string | null) {
  if (!value) {
    return placeholder.value
  }
  try {
    return new Intl.DateTimeFormat(locale.value, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value))
  } catch {
    return value
  }
}

const formattedCreatedAt = computed(() => formatDate(props.profile?.created_at ?? null))
const formattedUpdatedAt = computed(() => formatDate(props.profile?.updated_at ?? null))
</script>

<style scoped lang="scss">
.profile-details {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;
  border-radius: 1rem;
  background-color: #ffffff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);

  &__content {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  &__header {
    display: flex;
    gap: 1.5rem;
    align-items: center;
  }

  &__avatar-wrap {
    width: 96px;
    height: 96px;
    border-radius: 50%;
    overflow: hidden;
    background: #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__avatar {
    width: 100%;
    height: 100%;
    object-fit: cover;

    &_placeholder {
      font-size: 2rem;
      font-weight: 600;
      color: #64748b;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #e2e8f0;
    }
  }

  &__identity {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  &__name {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0;
  }

  &__email {
    margin: 0;
    color: #475569;
    font-size: 1rem;
  }

  &__list {
    display: grid;
    gap: 0.75rem;
  }

  &__item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid #e2e8f0;

    &:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
  }

  &__label {
    font-size: 0.875rem;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  &__value {
    font-size: 1rem;
    color: #0f172a;
  }

  &__status {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    border-radius: 0.75rem;
    background: #f8fafc;
    color: #475569;

    &_loading {
      color: #2563eb;
    }

    &_error {
      background: #fef2f2;
      color: #b91c1c;
    }

    &_empty {
      background: #f1f5f9;
    }
  }

  &__spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid #bfdbfe;
    border-top-color: #2563eb;
    border-radius: 50%;
    animation: profile-details__spin 0.8s linear infinite;
  }

  &__status-text {
    font-size: 0.95rem;
  }
}

@keyframes profile-details__spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
