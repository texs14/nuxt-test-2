import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { LocalizedString, DurationData } from '~/types/content';

export function useLocalizedContent() {
  const { locale } = useI18n();

  const currentLocale = computed(() => {
    const validLocales = ['ru', 'en', 'th'] as const;
    return validLocales.includes(locale.value as any) ? locale.value : 'ru';
  });

  function getLocalizedValue(value: LocalizedString, fallback = ''): string {
    if (!value) return fallback;
    if (typeof value === 'string') return value;

    const current = currentLocale.value;
    return value[current] ?? value.ru ?? value.en ?? value.th ?? fallback;
  }

  function getDuration(durationData: DurationData | null | undefined): string {
    return durationData?.text || '';
  }

  return {
    currentLocale,
    getLocalizedValue,
    getDuration,
  };
}
