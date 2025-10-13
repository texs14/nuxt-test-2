<template>
  <UApp>
    <div class="app">
      <NuxtRouteAnnouncer />
      <NavPanel class="app__nav-panel" />
      <NuxtPage />
    </div>
  </UApp>
</template>

<script setup lang="ts">
const i18nHead = useLocaleHead();
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

    padding-top: 16px;
    padding-bottom: 16px;

    @media screen and (max-width: 1440px) {
      padding-left: 16px;
      padding-right: 16px;
    }
  }
}
</style>
