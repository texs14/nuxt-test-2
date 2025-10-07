interface ProfileRole {
  role: string;
}

export default defineNuxtRouteMiddleware(async () => {
  const user = useSupabaseUser();
  const supabase = useSupabaseClient();

  if (!user.value) {
    return navigateTo('/login');
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.value.id)
      .single();

    if (error || !data) {
      return navigateTo('/');
    }

    const profileData = data as ProfileRole;
    const userRole = profileData.role;

    if (userRole !== 'moderator' && userRole !== 'admin') {
      return navigateTo('/');
    }
  } catch {
    return navigateTo('/');
  }
});
