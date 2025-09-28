import type { Database } from '~~/types/supabase';
import type { ProfileUpdatable } from '~~/utils/validation';
import { sanitizeProfilePayload, validateProfilePatch } from '~~/utils/validation';

export function useProfile() {
  const profile = useState<Database['public']['Tables']['profiles']['Row'] | null>(
    'profile',
    () => null
  );

  async function fetchProfile() {
    const headers = useRequestHeaders(['cookie']);
    const data = await $fetch<Database['public']['Tables']['profiles']['Row'] | null>(
      '/api/profile',
      {
        headers,
      }
    );
    profile.value = data;
    return data;
  }

  async function updateProfile(input: Record<string, any>) {
    const payload: ProfileUpdatable = sanitizeProfilePayload(input);
    const { ok, errors } = validateProfilePatch(payload);
    if (!ok) {
      throw createError({ statusCode: 400, statusMessage: errors.join('; ') });
    }

    const headers = useRequestHeaders(['cookie']);
    const updated = await $fetch<Database['public']['Tables']['profiles']['Row']>('/api/profile', {
      method: 'PATCH',
      body: payload,
      headers,
    });
    profile.value = updated;
    return updated;
  }

  return { profile, fetchProfile, updateProfile };
}
