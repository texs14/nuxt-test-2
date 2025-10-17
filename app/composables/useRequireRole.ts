import type { UserRole } from './useUserRole';

interface ProfileRole {
  role: string;
}

/**
 * Проверяет наличие требуемой роли у текущего пользователя
 * @param requiredRoles - массив допустимых ролей
 * @returns true если роль подходит, иначе перенаправляет
 */
export async function useRequireRole(requiredRoles: UserRole[]) {
  const user = useSupabaseUser();
  const supabase = useSupabaseClient();

  // Проверка авторизации
  if (!user.value) {
    return navigateTo('/login');
  }

  try {
    // Получение роли из БД
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.value.id)
      .single();

    if (error || !data) {
      return navigateTo('/');
    }

    const profileData = data as ProfileRole;
    const userRole = profileData.role as UserRole;

    // Проверка соответствия роли
    if (!requiredRoles.includes(userRole)) {
      return navigateTo('/');
    }

    return true;
  } catch {
    return navigateTo('/');
  }
}
