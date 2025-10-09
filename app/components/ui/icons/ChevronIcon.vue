<template>
  <svg
    class="ui-chevron__icon"
    :class="{ 'ui-chevron__icon_state_open': props.open }"
    viewBox="0 0 20 20"
    aria-hidden="true"
    v-bind="$attrs"
  >
    <path
      d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z"
      fill="currentColor"
    />
  </svg>
</template>

<script setup lang="ts">
const props = defineProps<{
  open?: boolean;
}>();
</script>

<style scoped lang="scss">
.ui-chevron__icon {
  display: inline-block;
  transition: transform 0.2s ease;
}

.ui-chevron__icon_state_open {
  transform: rotate(180deg);
}
</style>
