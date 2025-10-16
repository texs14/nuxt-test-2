# Использование useSupabaseCrud

Универсальный composable для CRUD операций с таблицами Supabase.

## Установка

Composable находится в `app/composables/useSupabaseCrud.ts` и автоматически доступен во всех компонентах.

## Основное использование

```typescript
const crud = useSupabaseCrud({ table: 'new_dictionar' });

// Получение данных
await crud.select();

// Состояния
console.log(crud.loading.value); // boolean
console.log(crud.error.value);   // string | null
console.log(crud.data.value);    // TableRow[] | null
```

## Методы

### select(filters?, options?)

Выборка строк с фильтрацией.

```typescript
// Простой выбор всех строк
await crud.select();

// С фильтрами
await crud.select({ word_th: 'สวัสดี' });

// JSONB фильтры (для поля headword)
await crud.select({ 'headword->>script': 'อาหารไทย' });

// С опциями
await crud.select(
  { word_th: 'สวัสดี' },
  {
    columns: 'id, word_th, translation',
    limit: 10,
    offset: 0,
    orderBy: { column: 'created_at', ascending: false }
  }
);
```

### insert(payload)

Создание одной или нескольких строк.

```typescript
// Одна строка
await crud.insert({
  entry_id: 'thai_001',
  headword: { script: 'อาหารไทย', ipa: '/a:ha:n thaj/' },
  senses: [{ definition: 'Тайская еда' }]
});

// Множественная вставка
await crud.insert([
  { entry_id: 'thai_001', headword: {}, senses: [] },
  { entry_id: 'thai_002', headword: {}, senses: [] }
]);
```

### update(payload, filters?)

Обновление строк.

```typescript
// Обновление по фильтрам
await crud.update(
  { translation: ['привет', 'здравствуй'] },
  { word_th: 'สวัสดี' }
);

// Обновление JSONB поля
await crud.update(
  { headword: { script: 'สวัสดี', ipa: '/sawatdi:/' } },
  { 'headword->>script': 'สวัสดี' }
);
```

### remove(filters?)

Удаление строк.

```typescript
// Удаление по ID
await crud.remove({ id: 123 });

// Удаление по JSONB фильтру
await crud.remove({ 'headword->>script': 'อาหารไทย' });
```

### clearError()

Очистка состояния ошибки.

```typescript
crud.clearError();
```

### clearData()

Очистка данных.

```typescript
crud.clearData();
```

## Примеры для разных таблиц

### Таблица `profiles`

```typescript
const profiles = useSupabaseCrud({ table: 'profiles' });

// Получение профиля пользователя
await profiles.select({ id: user.value?.id });

// Обновление словаря
await profiles.update(
  { vocabulary: [1, 2, 3, 4, 5] },
  { id: user.value?.id }
);
```

### Таблица `new_dictionar`

```typescript
const dictionary = useSupabaseCrud({ table: 'new_dictionar' });

// Поиск по тайскому слову в JSONB
await dictionary.select({ 'headword->>script': 'อาหารไทย' });

// Добавление новой записи
await dictionary.insert({
  entry_id: 'thai_food',
  headword: { script: 'อาหารไทย', ipa: '/a:ha:n thaj/' },
  senses: [
    {
      definition: 'Thai food',
      translations: ['тайская еда', 'тайская кухня']
    }
  ]
});
```

### Таблица `dictionary` (старая структура)

```typescript
const oldDict = useSupabaseCrud({ table: 'dictionary' });

await oldDict.select(
  { word_th: 'สวัสดี' },
  { columns: 'id, word_th, translation, transcription_en' }
);
```

## Обработка ошибок

```typescript
const crud = useSupabaseCrud({ table: 'new_dictionar' });

const result = await crud.select({ id: 999 });

if (crud.error.value) {
  console.error('Ошибка:', crud.error.value);
} else {
  console.log('Данные:', crud.data.value);
}
```

## Реактивность

```vue
<template>
  <div>
    <div v-if="crud.loading.value">Загрузка...</div>
    <div v-else-if="crud.error.value">Ошибка: {{ crud.error.value }}</div>
    <div v-else>
      <div v-for="item in crud.data.value" :key="item.id">
        {{ item }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const crud = useSupabaseCrud({ table: 'new_dictionar' });

onMounted(async () => {
  await crud.select();
});
</script>
```

## Примечания

- Все методы возвращают `Promise<TableRow<T>[] | null>`
- При ошибке возвращается `null` и устанавливается `error.value`
- Состояние `loading` автоматически управляется
- JSONB фильтры поддерживают операторы `->>` и `@>`
- TypeScript автоматически выводит типы на основе указанной таблицы
