<template>
  <div class="app">
    <NuxtRouteAnnouncer />
    <NavPanel />
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
const i18nHead = useLocaleHead({ addDirAttribute: true, addSeoAttributes: true })
useHead(() => ({
  htmlAttrs: i18nHead.value.htmlAttrs,
  link: i18nHead.value.link,
  meta: i18nHead.value.meta
}))
</script>

<style scoped>
  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
</style>