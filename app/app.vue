<template>
  <div class="app">
    <NuxtRouteAnnouncer />
    <NavPanel class="app__nav-panel" />
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
const i18nHead = useLocaleHead({ addDirAttribute: true, addSeoAttributes: true });
useHead(() => ({
  htmlAttrs: i18nHead.value.htmlAttrs,
  link: i18nHead.value.link,
  meta: i18nHead.value.meta,
}));
</script>

<style lang="scss" scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;

  &__nav-panel {
    max-width: 1440px;
    width: 100%;
    margin: 0 auto;
    box-sizing: border-box;

    @media screen and (max-width: 1440px) {
      padding: 0 16px;
    }
  }
}
</style>
