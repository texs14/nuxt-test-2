export type UserRole = 'user' | 'moderator' | 'admin';

interface ProfileWithRole {
  role: string;
}

export function useUserRole() {
  const supabase = useSupabaseClient();
  const user = useSupabaseUser();

  const userRole = ref<UserRole | null>(null);
  const isLoading = ref(false);

  const canModerate = computed(() => {
    return userRole.value === 'moderator' || userRole.value === 'admin';
  });

  const isAdmin = computed(() => {
    return userRole.value === 'admin';
  });

  async function fetchUserRole() {
    if (!user.value) {
      userRole.value = null;
      return null;
    }

    isLoading.value = true;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.value.id)
        .single();

      if (error) {
        userRole.value = null;
        return null;
      }

      const profileData = data as ProfileWithRole;
      userRole.value = (profileData?.role as UserRole) || 'user';
      return userRole.value;
    } catch {
      userRole.value = null;
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  watch(
    user,
    async (newUser) => {
      if (newUser) {
        await fetchUserRole();
      } else {
        userRole.value = null;
      }
    },
    { immediate: true }
  );

  return {
    userRole,
    canModerate,
    isAdmin,
    isLoading,
    fetchUserRole,
  };
}
