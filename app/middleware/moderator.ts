/**
 * Middleware для проверки доступа модераторов и администраторов
 */
export default defineNuxtRouteMiddleware(async () => {
  return await useRequireRole(['moderator', 'admin']);
});
