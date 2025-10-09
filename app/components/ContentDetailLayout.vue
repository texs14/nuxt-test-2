<template>
  <section class="content-detail">
    <div v-if="loading" class="content-detail__state">
      <div class="content-detail__loader">{{ loadingText }}</div>
    </div>
    <div v-else-if="error" class="content-detail__state content-detail__state_error">
      {{ errorText }}
    </div>

    <template v-else>
      <PageHeader :title="title" :level="level">
        <slot name="header-actions" />
      </PageHeader>

      <div class="content-detail__content">
        <div v-if="$slots.player" class="content-detail__player">
          <slot name="player" />
        </div>

        <div v-if="$slots.description" class="content-detail__description">
          <slot name="description" />
        </div>

        <div v-if="$slots.actions" class="content-detail__actions">
          <slot name="actions" />
        </div>

        <section v-if="$slots.editor" class="content-detail__editor">
          <slot name="editor" />
        </section>

        <section v-if="$slots.comments" class="content-detail__comments">
          <slot name="comments" />
        </section>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
interface Props {
  title?: string;
  loading?: boolean;
  error?: string | null;
  loadingText?: string;
  errorText?: string;
  level?: string;
}

withDefaults(defineProps<Props>(), {
  title: '',
  loading: false,
  error: null,
  loadingText: 'Загрузка…',
  errorText: 'Произошла ошибка',
  level: '',
});
</script>

<style scoped lang="scss">
.content-detail {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;

  &__state {
    text-align: center;
    padding: 40px;
    color: #6b7280;

    &_error {
      color: #dc2626;
    }
  }

  &__loader {
    color: #6b7280;
  }

  &__content {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  &__player {
    margin: 0 auto;
    max-width: 100%;
  }

  &__meta {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    font-size: 14px;
  }

  &__description {
    background: #f9fafb;
    padding: 20px;
    border-radius: 12px;
    color: #374151;
    line-height: 1.6;
  }

  &__actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__editor {
    padding: 24px;
    background: #f9fafb;
    border-radius: 12px;
  }

  &__comments {
    margin-top: 8px;
  }
}
</style>
