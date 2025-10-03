<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M8 5v14l11-7z"
      fill="currentColor"
    />
  </svg>
</template>

<script setup lang="ts">
defineProps<{
  size?: number | string;
}>();
</script>
