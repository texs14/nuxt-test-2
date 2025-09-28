<template>
  <Child />
</template>

<script setup lang="ts">
const user = useSupabaseUser();
const redirectInfo = useSupabaseCookieRedirect();

definePageMeta({ requiresAuth: false });

watch(
  user,
  () => {
    if (user.value) {
      const path = redirectInfo.pluck();
      return navigateTo(path || '/');
    }
  },
  { immediate: true }
);
</script>
