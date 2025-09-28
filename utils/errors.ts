type AnyError = { status?: number; message?: string; code?: string; name?: string } | any;

const CODE_MESSAGES: Record<string, string> = {
  invalid_grant: 'Неверный логин или пароль.',
  invalid_credentials: 'Неверный логин или пароль.',
  user_not_found: 'Пользователь не найден.',
  email_not_confirmed: 'E‑mail не подтверждён. Проверьте почту.',
  user_banned: 'Аккаунт заблокирован.',
  weak_password: 'Слишком простой пароль. Используйте не менее 8 символов.',
  over_email_send_rate_limit: 'Слишком много запросов. Попробуйте позже.',
  provider_disabled: 'Провайдер OAuth отключен.',
  signup_disabled: 'Регистрация отключена админом.',
  '23505': 'Значение уже занято (нарушение уникальности).',
};

export function normalizeAuthError(err: AnyError): { code?: string; message: string } {
  if (!err) return { message: 'Неизвестная ошибка' };
  const code = (err.code || '').toString();
  if (code && CODE_MESSAGES[code]) return { code, message: CODE_MESSAGES[code] };

  if (err.name === 'AuthApiError') {
    const status = Number(err.status || 400);
    if (status === 401) return { code: 'unauthorized', message: 'Не авторизовано' };
    if (status === 422) return { code: 'weak_password', message: CODE_MESSAGES.weak_password };
    if (status === 429)
      return { code: 'rate_limited', message: CODE_MESSAGES.over_email_send_rate_limit };
    return { code: 'auth_api_error', message: err.message || 'Ошибка аутентификации' };
  }

  return { code, message: err.message || 'Произошла ошибка' };
}
