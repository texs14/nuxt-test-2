import type { Database } from '~~/types/supabase'
import { normalizeAuthError } from '~~/utils/errors'
import { validateAge, validateFirstName, validateEmail, validatePassword } from '~~/utils/validation'

export function useAuth() {
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  const config = useRuntimeConfig()
  const siteUrl = config.public.siteUrl || (process.client ? window.location.origin : '')

  async function signUpEmail(payload: {
    email: string
    password: string
    age: number
    first_name: string
    last_name?: string | null
    username?: string | null
    avatar_url?: string | null
    city?: string | null
  }) {
    // Валидации формы регистрации
    if (!validateEmail(payload.email)) throw createError({ statusCode: 400, statusMessage: 'Некорректный email' })
    if (!validatePassword(payload.password)) throw createError({ statusCode: 400, statusMessage: 'Пароль должен быть не менее 8 символов' })
    if (!validateAge(payload.age)) throw createError({ statusCode: 400, statusMessage: 'Возраст должен быть в диапазоне 1–150' })
    if (!validateFirstName(payload.first_name)) throw createError({ statusCode: 400, statusMessage: 'Имя обязательно (1–100 символов)' })

    const { data, error } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        emailRedirectTo: `${siteUrl}/confirm`,
        data: {
          age: payload.age,
          first_name: payload.first_name,
          last_name: payload.last_name ?? undefined,
          username: payload.username ?? undefined,
          avatar_url: payload.avatar_url ?? undefined,
          city: payload.city ?? undefined
        }
      }
    })

    if (error) {
      const e = normalizeAuthError(error)
      throw createError({ statusCode: 400, statusMessage: e.message })
    }
    return data
  }

  async function signInWithPassword(email: string, password: string) {
    if (!validateEmail(email)) throw createError({ statusCode: 400, statusMessage: 'Некорректный email' })
    if (!validatePassword(password)) throw createError({ statusCode: 400, statusMessage: 'Пароль должен быть не менее 8 символов' })

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      const e = normalizeAuthError(error)
      throw createError({ statusCode: 401, statusMessage: e.message })
    }
    return data
  }

  async function signInWithGoogleOAuth() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${siteUrl}/confirm` }
    })
    if (error) {
      const e = normalizeAuthError(error)
      throw createError({ statusCode: 400, statusMessage: e.message })
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) {
      const e = normalizeAuthError(error)
      throw createError({ statusCode: 400, statusMessage: e.message })
    }
  }

  async function resetPassword(email: string) {
    if (!validateEmail(email)) throw createError({ statusCode: 400, statusMessage: 'Некорректный email' })
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/confirm`
    })
    if (error) {
      const e = normalizeAuthError(error)
      throw createError({ statusCode: 400, statusMessage: e.message })
    }
  }

  async function updatePassword(newPassword: string) {
    if (!validatePassword(newPassword)) throw createError({ statusCode: 400, statusMessage: 'Пароль должен быть не менее 8 символов' })
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      const e = normalizeAuthError(error)
      throw createError({ statusCode: 400, statusMessage: e.message })
    }
  }

  return {
    user,
    signUpEmail,
    signInWithPassword,
    signInWithGoogleOAuth,
    signOut,
    resetPassword,
    updatePassword
  }
}
