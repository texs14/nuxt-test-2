<template>
  <div class="app">
    <NuxtRouteAnnouncer />
    <NavPanel />
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
</style>