<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M4 9v6h4l5 5V4L8 9H4z" fill="currentColor" />
  </svg>
</template>

<script setup lang="ts">
defineProps<{
  size?: number | string;
}>();
</script>
