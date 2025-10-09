<template>
  <header class="page-header">
    <h1 class="page-header__title">{{ title }}</h1>
    <span v-if="level" class="badge badge_level">{{ level }}</span>
    <div v-if="$slots.default" class="page-header__actions">
      <slot />
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  level?: string;
}>();
</script>

<style scoped lang="scss">
.badge {
  margin-left: 12px;
  margin-right: auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  padding-bottom: 16px;
  border-bottom: 2px solid #e5e7eb;

  &__title {
    font-size: 32px;
    font-weight: 700;
    margin: 0;
    color: #111827;
  }

  &__actions {
    display: flex;
    gap: 12px;
    align-items: center;
  }
}
</style>
