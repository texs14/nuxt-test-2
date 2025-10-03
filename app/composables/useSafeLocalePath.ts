import type { RouteLocationRaw } from 'vue-router';

/**
 * Безопасная обертка для useLocalePath, которая перехватывает ошибки
 * при обращении к роутеру до его полной инициализации
 */
export const useSafeLocalePath = () => {
  const localePath = useLocalePath();

  return (route: RouteLocationRaw | string, locale?: any): string => {
    try {
      return localePath(route as any, locale);
    } catch (error) {
      // При перезагрузке страницы роутер может быть не полностью инициализирован
      // Возвращаем заглушку вместо краша
      if (typeof route === 'string') {
        return route;
      }
      return '#';
    }
  };
};
