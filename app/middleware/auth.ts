export default defineNuxtRouteMiddleware((to) => {
    const user = useSupabaseUser()
    const redirectInfo = useSupabaseCookieRedirect()

    // Публичные маршруты, которые всегда доступны
    const publicPaths = new Set<string>(['/', '/login', '/register', '/confirm'])

    // Если маршрут публичный или явно помечен как не требующий авторизации
    if (publicPaths.has(to.path) || to.meta?.requiresAuth === false) {
      return
    }

    // Редирект только для маршрутов, которые явно помечены как защищенные
    if (to.meta?.requiresAuth && !user.value) {
      // Сохраняем исходный путь, чтобы вернуть пользователя после входа
      redirectInfo.path.value = to.fullPath
      return navigateTo('/login')
    }
})