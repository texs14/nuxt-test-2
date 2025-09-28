<template>
  <AuthLoginForm />
  <!-- РђРІС‚Рѕ-Р·Р°РїСѓСЃРє OAuth РїРѕ query ?provider=google СЃРѕС…СЂР°РЅСЏРµС‚СЃСЏ -->
</template>

<script setup lang="ts">
definePageMeta({ requiresAuth: false });

const route = useRoute();
const user = useSupabaseUser();
const redirectInfo = useSupabaseCookieRedirect();
const { signInWithGoogleOAuth } = useAuth();

onMounted(async () => {
  // РЎРѕС…СЂР°РЅСЏРµРј Р¶РµР»Р°РµРјС‹Р№ СЂРµРґРёСЂРµРєС‚ РІ cookie, РµСЃР»Рё РїРµСЂРµРґР°РЅ С‡РµСЂРµР· query
  const redirect = route.query.redirect;
  if (typeof redirect === 'string' && redirect) {
    try {
      redirectInfo.path.value = decodeURIComponent(redirect);
    } catch {
      /* noop */
    }
  }

  // Р•СЃР»Рё СѓР¶Рµ Р°РІС‚РѕСЂРёР·РѕРІР°РЅС‹ вЂ” СЃСЂР°Р·Сѓ РІРµСЂРЅСѓС‚СЊ РЅР° СЃРѕС…СЂР°РЅС‘РЅРЅС‹Р№ РїСѓС‚СЊ
  if (user.value) {
    const path = redirectInfo.pluck();
    return navigateTo(path || '/');
  }

  // Р—Р°РїСѓСЃРє OAuth (Google, PKCE) РїСЂРё СЏРІРЅРѕРј СѓРєР°Р·Р°РЅРёРё РїСЂРѕРІР°Р№РґРµСЂР°
  const provider = route.query.provider;
  if (provider === 'google') {
    try {
      await signInWithGoogleOAuth();
    } catch (e) {
      // Р’ СЃР»СѓС‡Р°Рµ РѕС€РёР±РєРё РІРµСЂРЅС‘Рј РЅР° РєРѕСЂРµРЅСЊ СЃ РїР°СЂР°РјРµС‚СЂРѕРј
      return navigateTo('/?auth_error=oauth');
    }
  }
});
</script>
