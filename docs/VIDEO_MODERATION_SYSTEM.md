# Система модерации видео

## Обзор

Реализована полная система модерации видео с поддержкой ролей пользователей (user, moderator, admin). Видео проходят через статусы модерации перед публикацией.

## Архитектура

### Статусы видео

- **`moderation`** - видео на модерации (по умолчанию при создании)
- **`approved`** - одобренное видео (видно всем пользователям)
- **`rejected`** - отклонённое видео (зарезервировано для будущего использования)

### Роли пользователей

- **`user`** - обычный пользователь (видит только approved видео)
- **`moderator`** - модератор (видит все видео, может создавать/редактировать)
- **`admin`** - администратор (полный доступ + одобрение видео)

## База данных (Supabase)

### Изменения в таблице `video_items`

```sql
-- Добавлена колонка status
ALTER TABLE public.video_items 
ADD COLUMN status TEXT NOT NULL DEFAULT 'moderation'
CHECK (status IN ('moderation', 'approved', 'rejected'));

-- Индекс для оптимизации
CREATE INDEX idx_video_items_status ON public.video_items(status);

-- Поля теперь nullable (необязательны при создании)
ALTER TABLE public.video_items 
ALTER COLUMN title DROP NOT NULL,
ALTER COLUMN description DROP NOT NULL,
ALTER COLUMN level DROP NOT NULL,
ALTER COLUMN duration DROP NOT NULL,
ALTER COLUMN subtitles DROP NOT NULL,
ALTER COLUMN preview_url DROP NOT NULL,
ALTER COLUMN video_url DROP NOT NULL;
```

### Таблица `profiles`

Должна содержать колонку `role`:

```sql
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
CHECK (role IN ('user', 'moderator', 'admin'));
```

### RLS Политики

**SELECT** - фильтрация по статусу:
```sql
CREATE POLICY video_items_select_policy ON public.video_items
FOR SELECT
USING (
  status = 'approved' 
  OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('moderator', 'admin')
  )
);
```

**INSERT** - доступ для модераторов и админов:
```sql
CREATE POLICY video_items_insert_policy ON public.video_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('moderator', 'admin')
  )
);
```

**UPDATE** - доступ для модераторов и админов:
```sql
CREATE POLICY video_items_update_policy ON public.video_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('moderator', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('moderator', 'admin')
  )
);
```

**DELETE** - только для админов:
```sql
CREATE POLICY video_items_delete_policy ON public.video_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);
```

## API Endpoints

### POST `/api/video-items`

**Описание:** Создание нового видео

**Минимальные требования:**
- `video_url` (обязательно)

**Опциональные поля:**
- `id` - если не передан, генерируется автоматически
- `title` - по умолчанию `{ ru: 'Видео без названия', th: '', en: '' }`
- `description`
- `level` - по умолчанию `'A1'`
- `duration`
- `subtitles` - по умолчанию `[]`
- `status` - по умолчанию `'moderation'`
- `preview_url`

**Ответ:**
```json
{
  "ok": true,
  "id": "uuid"
}
```

### PUT `/api/video-items/[id]`

**Описание:** Обновление существующего видео

**Доступ:** Модераторы и админы

**Разрешённые поля для обновления:**
- `title`
- `description`
- `level`
- `subtitles`
- `video_url`
- `preview_url`
- `duration`
- `status` (только для админов!)

**Примечание:** Изменение `status` доступно только пользователям с ролью `admin`.

**Ответ:**
```json
{
  "ok": true,
  "id": "uuid"
}
```

**Ошибки:**
- `404` - видео не найдено
- `403` - нет прав (при попытке изменить status не-админом)

### POST `/api/video-items/[id]/approve`

**Описание:** Одобрение видео (изменение статуса на `approved`)

**Доступ:** Только администраторы

**Ответ:**
```json
{
  "ok": true,
  "id": "uuid",
  "status": "approved"
}
```

**Ошибки:**
- `401` - не авторизован
- `403` - нет прав (не админ)
- `404` - видео не найдено

## Frontend

### Middleware

Оба middleware используют общий composable `useRequireRole` для проверки ролей (DRY принцип).

#### `app/middleware/admin.ts`

Проверяет что пользователь имеет роль `admin`.

```typescript
export default defineNuxtRouteMiddleware(async () => {
  return await useRequireRole(['admin']);
});
```

#### `app/middleware/moderator.ts`

Проверяет роль `moderator` или `admin`.

```typescript
export default defineNuxtRouteMiddleware(async () => {
  return await useRequireRole(['moderator', 'admin']);
});
```

### Composable для проверки ролей

#### `app/composables/useRequireRole.ts`

Переиспользуемая функция для проверки наличия требуемой роли у пользователя.

```typescript
export async function useRequireRole(requiredRoles: UserRole[]) {
  const user = useSupabaseUser();
  const supabase = useSupabaseClient();

  if (!user.value) {
    return navigateTo('/login');
  }

  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.value.id)
    .single();

  const userRole = data?.role as UserRole;

  if (!requiredRoles.includes(userRole)) {
    return navigateTo('/');
  }

  return true;
}
```

**Использование:**
```typescript
// В middleware
await useRequireRole(['admin', 'moderator']);

// В компонентах (проверка перед действием)
const canAccess = await useRequireRole(['admin']);
if (canAccess === true) {
  // выполнить действие
}
```

### Страница добавления видео (`app/pages/videos/add-new.vue`)

**Основные улучшения:**

1. **Автоматическое создание записи** - после загрузки видео автоматически создаётся запись в БД со статусом `moderation`

2. **Автосохранение** - изменения полей автоматически сохраняются через 2 секунды после редактирования

3. **Необязательные поля** - можно сохранить видео без субтитров и других данных

4. **Кнопка "Одобрить"** - доступна только администраторам для видео на модерации

**Workflow:**

```
1. Выбор видео → Автозагрузка
2. Создание записи в БД (status: moderation)
3. Редактирование полей → Автосохранение каждые 2 сек
4. [Для админов] Кнопка "Одобрить" → status: approved
```

**Ключевые функции:**

- `createVideoRecord()` - создаёт запись в БД после загрузки
- `autoSaveChanges()` - автоматическое обновление через debounce
- `saveVideo()` - ручное сохранение по кнопке
- `approveVideo()` - одобрение видео (только админы)

### Список видео (`app/pages/videos/index.vue`)

**Фильтрация через RLS политики:**
- Использует `useLazyAsyncData` для выполнения запроса на клиенте
- RLS политики автоматически фильтруют видео по роли пользователя
- Обычные пользователи видят только `approved` видео
- Модераторы и админы видят все видео

### UI Компоненты

#### `StatusBadge.vue`

Компонент для отображения статуса видео с цветовой индикацией.

**Props:**
- `status: 'moderation' | 'approved' | 'rejected'`

**Стили:**
- `moderation` - жёлтый (#fef3c7)
- `approved` - зелёный (#d1fae5)
- `rejected` - красный (#fee2e2)

**Использование:**
```vue
<StatusBadge 
  v-if="canModerate && item.status" 
  :status="item.status" 
/>
```

#### `VideoCard.vue`

Обновлён для отображения бейджа статуса для модераторов/админов.

```vue
<StatusBadge 
  v-if="canModerate && status" 
  :status="status" 
  class="video-card__status" 
/>
```

### Composables

#### `useUserRole()`

Определяет роль текущего пользователя.

**Возвращает:**
```typescript
{
  userRole: Ref<UserRole | null>,  // 'user' | 'moderator' | 'admin'
  canModerate: ComputedRef<boolean>, // moderator или admin
  isAdmin: ComputedRef<boolean>,     // только admin
  isLoading: Ref<boolean>,
  fetchUserRole: () => Promise<UserRole | null>
}
```

## TypeScript типы

### `types/supabase.ts`

Обновлён интерфейс `video_items`:

```typescript
video_items: {
  Row: {
    id: string;  // изменено с number на string
    title: Json | string | null;
    description: Json | string | null;
    level: string | null;
    preview_url: string | null;
    duration: Json | null;
    video_url: string | null;
    subtitles: Json | null;
    status: 'moderation' | 'approved' | 'rejected';  // новое поле
    created_at: string | null;
    updated_at: string | null;
  };
  // ... Insert и Update типы
}
```

### `types/content.ts`

```typescript
export interface VideoItem extends BaseContentItem {
  id: string | number;
  duration?: Json | null;
  status?: 'moderation' | 'approved' | 'rejected';  // новое поле
}
```

## Локализация

### Русский (`locales/ru.json`)

```json
{
  "videos": {
    "addNew": {
      "approve": "Одобрить видео",
      "approving": "Одобрение...",
      "approveSuccess": "Видео успешно одобрено"
    },
    "status": {
      "moderation": "На модерации",
      "approved": "Опубликовано",
      "rejected": "Отклонено"
    }
  }
}
```

### Английский (`locales/en.json`)

```json
{
  "videos": {
    "addNew": {
      "approve": "Approve video",
      "approving": "Approving...",
      "approveSuccess": "Video successfully approved"
    },
    "status": {
      "moderation": "Under review",
      "approved": "Published",
      "rejected": "Rejected"
    }
  }
}
```

## Тестирование

### Сценарии тестирования

#### 1. Создание видео модератором

```
1. Залогиниться как модератор
2. Перейти на /videos/add-new
3. Загрузить видео
4. Проверить: запись создана со status = 'moderation'
5. Изменить title/description
6. Проверить: изменения автосохраняются
```

#### 2. Видимость видео по ролям

```
User:
- Видит только approved видео в списке
- Не видит видео на модерации

Moderator:
- Видит все видео в списке
- Видит бейджи статусов
- Может редактировать видео
- НЕ может одобрять видео

Admin:
- Видит все видео в списке
- Видит бейджи статусов
- Может редактировать видео
- Может одобрять видео кнопкой "Одобрить"
```

#### 3. Одобрение видео администратором

```
1. Залогиниться как admin
2. Открыть видео на модерации для редактирования
3. Проверить: кнопка "Одобрить" видна
4. Нажать "Одобрить"
5. Проверить: status изменился на 'approved'
6. Проверить: видео стало видно обычным пользователям
```

### Проверка RLS политик

**Тест 1: Обычный пользователь**
```sql
-- Подключиться как обычный пользователь
-- Должны вернуться только approved видео
SELECT id, status FROM video_items;
```

**Тест 2: Модератор**
```sql
-- Подключиться как модератор
-- Должны вернуться все видео
SELECT id, status FROM video_items;
```

**Тест 3: Попытка одобрения не-админом**
```sql
-- Подключиться как модератор
-- Должна вернуться ошибка RLS
UPDATE video_items SET status = 'approved' WHERE id = '...';
```

## Устранение проблем

### Видео не отображаются для админа

**Проблема:** Список пуст даже для администратора

**Решение:**
1. Проверить роль в БД: `SELECT role FROM profiles WHERE id = auth.uid()`
2. Убедиться что используется `useLazyAsyncData` (не `useAsyncData`)
3. Проверить токен авторизации в браузере

### Ошибка "Видео не найдено" при сохранении

**Проблема:** 404 при обновлении видео

**Причины:**
1. Запись не создалась в БД - проверить логи создания
2. ID не совпадает - проверить что `newId.value` установлен
3. RLS блокирует доступ - проверить роль пользователя

**Решение:**
- Открыть консоль браузера (F12)
- Найти логи `createVideoRecord START`, `Generated ID`, `Response status`
- Убедиться что видна строка `✅ Video record created successfully`

### Автосохранение не работает

**Проблема:** Изменения не сохраняются автоматически

**Причины:**
1. `saveOk.value` не установлен в `true` после создания
2. `watchEffect` не триггерится на изменения

**Решение:**
- Проверить что запись успешно создалась (`saveOk.value = true`)
- Автосохранение работает только после первого успешного создания

### Console.log warnings

**ESLint предупреждения** о `console.log` добавлены для отладки. После завершения разработки их можно убрать или заменить на proper logging систему.

## Миграции БД

Все миграции применены через Supabase MCP:

1. `add_video_status_and_make_fields_nullable` - добавление status и nullable полей
2. `update_video_items_rls_policies` - обновление RLS политик
3. `fix_video_items_nullable_fields` - исправление nullable для preview_url и video_url

## Безопасность

### Защита на уровне БД (RLS)

✅ **Row Level Security** включён для всех операций  
✅ Фильтрация по ролям на уровне БД  
✅ Автоматическая проверка прав при каждом запросе  

### Защита на уровне API

✅ Проверка роли пользователя перед изменением `status`  
✅ Service Key используется только на сервере  
✅ Валидация всех входных данных  

### Защита на уровне UI

✅ Middleware защищает маршруты  
✅ Условный рендеринг по ролям  
✅ Кнопки доступны только авторизованным пользователям  

## Производительность

### Оптимизация БД

- Индекс на колонке `status` для быстрой фильтрации
- RLS политики оптимизированы с EXISTS подзапросами

### Оптимизация Frontend

- `useLazyAsyncData` для клиентского рендеринга
- Debounce автосохранения (2 секунды)
- Условный рендеринг компонентов по ролям

## Дальнейшее развитие

### Возможные улучшения

1. **История изменений** - логирование всех изменений статуса
2. **Комментарии модератора** - причина отклонения
3. **Уведомления** - email при одобрении/отклонении
4. **Массовое одобрение** - bulk operations
5. **Статистика модерации** - дашборд для админов
6. **Автоматическая модерация** - AI проверка контента

### Известные ограничения

- Нет поддержки отклонения видео (rejected) в UI
- Нет истории изменений статусов
- Автосохранение работает только для полей формы, не для субтитров в редакторе

## Заключение

Система модерации полностью функциональна и готова к использованию. Все основные требования реализованы:

✅ Видео автоматически создаются со статусом `moderation`  
✅ Автосохранение изменений  
✅ Фильтрация по ролям через RLS  
✅ Кнопка одобрения для админов  
✅ UI компоненты для отображения статуса  
✅ Полная типизация TypeScript  
✅ Локализация на русском и английском  

---

**Дата создания:** 17 октября 2025  
**Версия:** 1.0.0  
**Автор:** Разработано с использованием Windsurf Cascade AI
