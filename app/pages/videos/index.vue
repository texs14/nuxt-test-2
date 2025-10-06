<template>
  <section class="videos">
    <PageHeader :title="t('videos.title')">
      <NuxtLink v-if="addNewLink !== '#'" :to="addNewLink" class="btn btn_primary">
        {{ t('videos.add') }}
      </NuxtLink>
    </PageHeader>

    <div v-if="pending" class="videos__state">{{ t('videos.loading') }}</div>
    <div v-else-if="error" class="videos__state videos__state_error">
      {{ t('videos.error') }}: {{ error.message }}
    </div>

    <div v-else class="videos__grid">
      <ContentCard
        v-for="item in items"
        :key="item.id"
        :to="localePath(`/videos/${item.id}`)"
        :title="getTitle(item)"
        :thumbnail-url="item.preview_url"
        :level="item.level"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

type Json = Record<string, any> | null;

interface VideoItem {
  id: string | number;
  title: Json | string;
  description?: Json | string | null;
  level?: string | null;
  preview_url?: string | null;
}

const supabase = useSupabaseClient();
const { t, locale } = useI18n();
const localePath = useLocalePath();
const safeLocalePath = useSafeLocalePath();

const addNewLink = computed(() => safeLocalePath({ name: 'videos-add-new' }));

const {
  data: items,
  pending,
  error,
} = await useAsyncData<VideoItem[]>('video-items', async () => {
  const { data, error } = await supabase
    .from('video_items')
    .select('id, title, description, level, preview_url')
    .order('id', { ascending: true });

  if (error) throw error;
  return data || [];
});

const currentLocale = computed<'ru' | 'en'>(() =>
  locale.value === 'ru' || locale.value === 'en' ? (locale.value as 'ru' | 'en') : 'en'
);

function getTitle(item: VideoItem): string {
  const val = item.title as Record<string, string> | string | undefined | null;
  if (!val) return '';
  if (typeof val === 'string') return val;
  return val[currentLocale.value] ?? val.en ?? val.ru ?? val.th ?? '';
}
</script>

<style lang="scss" scoped>
.videos {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;

  &__state {
    text-align: center;
    padding: 40px;
    color: #6b7280;

    &_error {
      color: #dc2626;
    }
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 24px;
  }
}

.btn {
  padding: 10px 20px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  font-size: 14px;
  transition: background 0.2s ease;
  display: inline-block;

  &_primary {
    background: #2563eb;
    color: white;

    &:hover {
      background: #1d4ed8;
    }
  }
}
</style>
