# 🚀 Миграция словаря - Быстрый старт

## Пошаговая инструкция

### ✅ Шаг 1: Применение миграции БД

Выполните SQL миграцию в Supabase:

```bash
# Через Supabase CLI
supabase db push

# Или вручную в Supabase Dashboard > SQL Editor
# Скопируйте содержимое: supabase/migrations/2025-10-13_new_dictionary_structure.sql
```

### ✅ Шаг 2: Миграция данных

**Выберите один из трех методов:**

#### Метод 1: SQL (⭐ Рекомендуется - самый простой)

1. Откройте **Supabase Dashboard** → **SQL Editor**
2. Скопируйте содержимое файла `scripts/migrate_dictionary_sql.sql`
3. Вставьте и нажмите **Run**

```sql
SELECT * FROM migrate_dictionary_to_new();
```

#### Метод 2: TypeScript/Node.js

```bash
# Установите зависимости
npm install -D tsx

# Установите переменные окружения
set SUPABASE_URL=https://your-project.supabase.co
set SUPABASE_SERVICE_KEY=your-service-role-key

# Запустите миграцию
npx tsx scripts/migrate_dictionary.ts
```

#### Метод 3: Python

```bash
# Установите зависимости
pip install supabase

# Установите переменные окружения
set SUPABASE_URL=https://your-project.supabase.co
set SUPABASE_SERVICE_KEY=your-service-role-key

# Запустите миграцию
python scripts/migrate_dictionary_to_new.py
```

**📚 Подробное сравнение методов**: см. `scripts/MIGRATION_METHODS.md`

### ✅ Шаг 3: Проверка результатов

```sql
-- В Supabase SQL Editor
SELECT 
  (SELECT COUNT(*) FROM dictionary) as старая_таблица,
  (SELECT COUNT(*) FROM new_dictionar) as новая_таблица;

-- Проверьте пример записи
SELECT * FROM new_dictionar WHERE headword->>'script' = 'สวัสดี';
```

### ✅ Шаг 4: Тестирование UI

1. Запустите dev сервер: `npm run dev`
2. Откройте приложение
3. Кликните на любое тайское слово
4. Убедитесь, что попап отображается корректно
5. Попробуйте добавить новое слово
6. Попробуйте отредактировать существующее слово

### ✅ Шаг 5: Переключение в production

Когда всё работает:

1. Разверните обновленный код на production
2. Примените SQL миграцию на production БД
3. Запустите скрипт миграции данных на production
4. Мониторьте ошибки в течение первых 24 часов

## 🎛️ Feature Flag

По умолчанию используется новая таблица. Чтобы переключиться на старую:

```typescript
// app/components/ui/InteractiveWord.vue
const USE_NEW_DICTIONARY = ref(false); // false = старая таблица
```

## 📊 Статус миграции

Проверьте статус в реальном времени:

```sql
SELECT 
  'Всего в старой таблице' as описание,
  COUNT(*) as количество
FROM dictionary

UNION ALL

SELECT 
  'Мигрировано в новую',
  COUNT(*)
FROM new_dictionar

UNION ALL

SELECT 
  'Не мигрировано',
  (SELECT COUNT(*) FROM dictionary) - (SELECT COUNT(*) FROM new_dictionar);
```

## ⚠️ Важные замечания

1. **Бэкап**: Сделайте бэкап БД перед миграцией
2. **Тестирование**: Сначала протестируйте на dev/staging
3. **Мониторинг**: Отслеживайте ошибки после деплоя
4. **Откат**: Старая таблица остается нетронутой для возможности отката

## 🔗 Полезные ссылки

- [Подробная документация](./docs/DICTIONARY_MIGRATION_GUIDE.md)
- [Структура данных](./docs/new-dictionary-structure.md)
- [Управление словарем](./docs/DICTIONARY_MANAGEMENT.md)

## 🆘 Проблемы?

### Ошибка: "Cannot find module '~/types/dictionary'"

**Решение**: Перезапустите dev сервер:
```bash
npm run dev
```

### Ошибка: "Property 'new_dictionar' does not exist"

**Решение**: Проверьте, что миграция SQL выполнена и типы Supabase обновлены:
```bash
# Обновите типы из Supabase
supabase gen types typescript --local > types/supabase.ts
```

### Ошибка при миграции Python

**Решение**: Убедитесь, что переменные окружения установлены правильно:
```bash
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_KEY
```

### Компоненты не отображаются

**Решение**: Очистите кэш и перезапустите:
```bash
rm -rf .nuxt
rm -rf node_modules/.cache
npm run dev
```

## ✨ Готово!

После успешной миграции:
- ✅ Словарь работает с новой структурой данных
- ✅ Поддержка множественных значений слов
- ✅ Детализированные переводы с частотностью
- ✅ Метаданные и темы
- ✅ Готовность к добавлению аудио/видео

---

**Время выполнения**: ~30 минут  
**Сложность**: Средняя  
**Требуется откат**: Нет (обратная совместимость)
