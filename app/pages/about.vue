<template>
  <section class="about">
    <h1 class="about__title">{{ t('nav.about') }}</h1>
    <p class="about__text">Thai Platform — demo страница «О проекте».</p>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
useHead(() => ({ title: t('nav.about') }))
</script>

<style scoped>
.about__title { font-size: 28px; margin: 16px 0; }
.about__text { color: #444; }
</style>
