const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-z0-9._-]{3,30}$/;

export function validateEmail(email: string): boolean {
  return EMAIL_RE.test(
    String(email || '')
      .trim()
      .toLowerCase()
  );
}

export function validatePassword(password: string): boolean {
  return typeof password === 'string' && password.length >= 8;
}

export function validateAge(age: number): boolean {
  if (!Number.isInteger(age)) return false;
  return age >= 1 && age <= 150;
}

export function validateFirstName(name: string): boolean {
  const v = String(name || '').trim();
  return v.length >= 1 && v.length <= 100;
}

export function validateUsername(username?: string | null): boolean {
  if (!username) return true;
  const v = String(username).trim();
  return USERNAME_RE.test(v);
}

export function isHttpUrl(url?: string | null): boolean {
  if (!url) return true;
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export type ProfileUpdatable = {
  username?: string | null;
  age?: number | null;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  city?: string | null;
};

export function sanitizeProfilePayload(input: Record<string, any>): ProfileUpdatable {
  const out: ProfileUpdatable = {};
  if ('username' in input) out.username = input.username ?? null;
  if ('age' in input) out.age = input.age ?? null;
  if ('first_name' in input) out.first_name = input.first_name ?? null;
  if ('last_name' in input) out.last_name = input.last_name ?? null;
  if ('avatar_url' in input) out.avatar_url = input.avatar_url ?? null;
  if ('city' in input) out.city = input.city ?? null;
  return out;
}

export function validateProfilePatch(p: ProfileUpdatable): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (p.username !== undefined && !validateUsername(p.username || undefined)) {
    errors.push('Неверный формат username (^[a-z0-9._-]{3,30}$)');
  }
  if (p.age !== undefined && p.age !== null) {
    if (!validateAge(p.age)) errors.push('Возраст должен быть целым числом 1–150');
  }
  if (p.first_name !== undefined && p.first_name !== null) {
    if (!validateFirstName(p.first_name)) errors.push('Имя должно быть 1–100 символов');
  }
  if (p.avatar_url !== undefined && p.avatar_url !== null) {
    if (!isHttpUrl(p.avatar_url)) errors.push('avatar_url должен начинаться с http/https');
  }
  return { ok: errors.length === 0, errors };
}
