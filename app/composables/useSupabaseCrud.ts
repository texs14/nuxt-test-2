import type { Database } from '~~/types/supabase';

type Tables = Database['public']['Tables'];
type TableName = keyof Tables;
type TableRow<T extends TableName> = Tables[T]['Row'];
type TableInsert<T extends TableName> = Tables[T]['Insert'];
type TableUpdate<T extends TableName> = Tables[T]['Update'];

export interface CrudOptions<T extends TableName> {
  table: T;
}

export interface SelectOptions {
  columns?: string;
  limit?: number;
  offset?: number;
  orderBy?: { column: string; ascending?: boolean };
}

export interface FilterOptions {
  [key: string]: any;
}

export function useSupabaseCrud<T extends TableName>(options: CrudOptions<T>) {
  const supabase = useSupabaseClient<Database>();
  const { table } = options;

  const loading = ref(false);
  const error = ref<string | null>(null);
  const data = ref<TableRow<T>[] | null>(null);

  /**
   * Очистка состояния ошибки
   */
  function clearError() {
    error.value = null;
  }

  /**
   * Очистка данных
   */
  function clearData() {
    data.value = null;
  }

  /**
   * Нормализация ошибки Supabase
   */
  function handleError(err: any, defaultMessage: string): string {
    if (err.message) return err.message;
    if (err.error_description) return err.error_description;
    if (err.hint) return err.hint;
    return defaultMessage;
  }

  /**
   * Выбор строк с фильтрацией
   * @param filters - объект фильтров { column: value } или { 'column->>jsonKey': value }
   * @param options - опции выборки (columns, limit, offset, orderBy)
   * @returns массив строк или null
   */
  async function select(
    filters?: FilterOptions,
    options?: SelectOptions
  ): Promise<TableRow<T>[] | null> {
    loading.value = true;
    error.value = null;

    try {
      let query = supabase.from(table).select(options?.columns || '*');

      // Применение фильтров
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          // Поддержка JSONB операторов
          if (key.includes('->>')) {
            query = query.eq(key, value);
          } else if (key.includes('@>')) {
            query = query.contains(key.replace('@>', ''), value);
          } else {
            query = query.eq(key, value);
          }
        });
      }

      // Сортировка
      if (options?.orderBy) {
        query = query.order(options.orderBy.column, {
          ascending: options.orderBy.ascending ?? true,
        });
      }

      // Пагинация
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data: result, error: selectError } = await query;

      if (selectError) throw selectError;

      // @ts-ignore - Supabase generic type complexity
      data.value = result as unknown as TableRow<T>[];
      // @ts-ignore - Supabase generic type complexity
      return data.value;
    } catch (err: any) {
      error.value = handleError(err, 'Ошибка при выборке данных');
      return null;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Создание одной или нескольких строк
   * @param payload - данные для вставки (объект или массив объектов)
   * @returns созданные строки или null
   */
  async function insert(payload: TableInsert<T> | TableInsert<T>[]): Promise<TableRow<T>[] | null> {
    loading.value = true;
    error.value = null;

    try {
      const { data: result, error: insertError } = await supabase
        .from(table)
        .insert(payload as any)
        .select();

      if (insertError) throw insertError;

      const insertedData = result as unknown as TableRow<T>[];
      data.value = insertedData;
      return insertedData;
    } catch (err: any) {
      error.value = handleError(err, 'Ошибка при создании записи');
      return null;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Обновление строк
   * @param payload - данные для обновления
   * @param filters - фильтры для выбора строк (если не указан, обновляет все)
   * @returns обновлённые строки или null
   */
  async function update(
    payload: TableUpdate<T>,
    filters?: FilterOptions
  ): Promise<TableRow<T>[] | null> {
    loading.value = true;
    error.value = null;

    try {
      let query = supabase.from(table).update(payload as any);

      // Применение фильтров
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (key.includes('->>')) {
            query = query.eq(key, value);
          } else if (key.includes('@>')) {
            query = query.contains(key.replace('@>', ''), value);
          } else {
            query = query.eq(key, value);
          }
        });
      }

      const { data: result, error: updateError } = await query.select();

      if (updateError) throw updateError;

      const updatedData = result as unknown as TableRow<T>[];
      data.value = updatedData;
      return updatedData;
    } catch (err: any) {
      error.value = handleError(err, 'Ошибка при обновлении записи');
      return null;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Удаление строк
   * @param filters - фильтры для выбора строк на удаление
   * @returns удалённые строки или null
   */
  async function remove(filters?: FilterOptions): Promise<TableRow<T>[] | null> {
    loading.value = true;
    error.value = null;

    try {
      let query = supabase.from(table).delete();

      // Применение фильтров
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (key.includes('->>')) {
            query = query.eq(key, value);
          } else if (key.includes('@>')) {
            query = query.contains(key.replace('@>', ''), value);
          } else {
            query = query.eq(key, value);
          }
        });
      }

      const { data: result, error: deleteError } = await query.select();

      if (deleteError) throw deleteError;

      const deletedData = result as unknown as TableRow<T>[];
      data.value = deletedData;
      return deletedData;
    } catch (err: any) {
      error.value = handleError(err, 'Ошибка при удалении записи');
      return null;
    } finally {
      loading.value = false;
    }
  }

  return {
    loading: readonly(loading),
    error: readonly(error),
    data: readonly(data),
    table,
    select,
    insert,
    update,
    remove,
    clearError,
    clearData,
  };
}
