export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser();
  const redirectInfo = useSupabaseCookieRedirect();

  // РџСѓР±Р»РёС‡РЅС‹Рµ РјР°СЂС€СЂСѓС‚С‹, РєРѕС‚РѕСЂС‹Рµ РІСЃРµРіРґР° РґРѕСЃС‚СѓРїРЅС‹
  const publicPaths = new Set<string>(['/', '/login', '/register', '/confirm']);

  // Р•СЃР»Рё РјР°СЂС€СЂСѓС‚ РїСѓР±Р»РёС‡РЅС‹Р№ РёР»Рё СЏРІРЅРѕ РїРѕРјРµС‡РµРЅ РєР°Рє РЅРµ С‚СЂРµР±СѓСЋС‰РёР№ Р°РІС‚РѕСЂРёР·Р°С†РёРё
  if (publicPaths.has(to.path) || to.meta?.requiresAuth === false) {
    return;
  }

  // Р РµРґРёСЂРµРєС‚ С‚РѕР»СЊРєРѕ РґР»СЏ РјР°СЂС€СЂСѓС‚РѕРІ, РєРѕС‚РѕСЂС‹Рµ СЏРІРЅРѕ РїРѕРјРµС‡РµРЅС‹ РєР°Рє Р·Р°С‰РёС‰РµРЅРЅС‹Рµ
  if (to.meta?.requiresAuth && !user.value) {
    // РЎРѕС…СЂР°РЅСЏРµРј РёСЃС…РѕРґРЅС‹Р№ РїСѓС‚СЊ, С‡С‚РѕР±С‹ РІРµСЂРЅСѓС‚СЊ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ РїРѕСЃР»Рµ РІС…РѕРґР°
    redirectInfo.path.value = to.fullPath;
    return navigateTo('/login');
  }
});
