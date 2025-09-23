<template>
  <section class="videos">
    <header class="videos__header">
      <h1 class="videos__title">{{ t('videos.title') }}</h1>
      <NuxtLink :to="localePath({ name: 'videos-add-new' })" class="videos__add">{{ t('videos.add') }}</NuxtLink>
    </header>

    <div v-if="pending" class="videos__state">{{ t('videos.loading') }}</div>
    <div v-else-if="error" class="videos__state">{{ t('videos.error') }}: {{ error.message }}</div>

    <div v-else class="videos__grid">
      <VideoCard
        v-for="item in items"
        :key="item.id"
        :id="item.id"
        :title="item.title"
        :level="item.level"
        :thumbnail-url="item.preview_url"
        class="videos__item"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
type Json = Record<string, any> | null

interface VideoItem {
  id: string | number
  title: Json | string
  description?: Json | string | null
  level?: string | null
  preview_url?: string | null
}

const supabase = useSupabaseClient()
const { t } = useI18n()
const localePath = useLocalePath()

const { data: items, pending, error } = await useAsyncData<VideoItem[]>(
  'video-items',
  async () => {
    const { data, error } = await supabase
      .from('video_items')
      .select('id, title, description, level, preview_url')
      .order('id', { ascending: true })

    if (error) throw error
    return data || []
  }
)
</script>


<style lang="scss" scoped>
.videos {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1rem;
  }

  &__add {
    padding: 8px 12px;
    border-radius: 8px;
    background: rgba(95, 255, 27, 0.7);
    color: #000;
    font-weight: 600;
    font-size: 18px;
    cursor: pointer;
    transition: background .2s ease;
  }
}
</style>