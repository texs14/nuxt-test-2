/**
 * Middleware для проверки доступа только администраторов
 */
export default defineNuxtRouteMiddleware(async () => {
  return await useRequireRole(['admin']);
});
