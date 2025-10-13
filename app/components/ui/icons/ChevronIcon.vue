<template>
  <UIcon
    aria-hidden="true"
    v-bind="$attrs"
    name="i-lucide-chevron-down"
    class="ui-chevron__icon"
    :class="{ 'ui-chevron__icon_state_open': props.open }"
  />
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
