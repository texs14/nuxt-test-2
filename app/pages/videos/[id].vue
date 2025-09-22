
<template>
    <section class="video-page">
      <div v-if="pendingVideo" class="video-page__state">Загрузка видео…</div>
      <div v-else-if="errorVideo" class="video-page__state">Ошибка: {{ errorVideo.message }}</div>
      <div v-else-if="!video" class="video-page__state">Видео не найдено</div>
  
      <template v-else>
        <header class="video-page__header">
          <h1 class="video-page__title">{{ titleText }}</h1>
          <span v-if="video.level" class="video-page__level">{{ video.level }}</span>
        </header>
  
        <VideoPlayer
          v-if="video.video_url"
          class="video-page__player"
          :src="video.video_url"
          :subtitles="subs"
          lang="ru"
        />
  
        <p v-if="descriptionText" class="video-page__description">{{ descriptionText }}</p>
  
        <section class="video-page__comments">
          <h2 class="video-page__comments_title">Комментарии</h2>
          <div v-if="pendingComments" class="video-page__state">Загрузка комментариев…</div>
          <div v-else-if="errorComments" class="video-page__state">Ошибка: {{ errorComments.message }}</div>
          <ul v-else class="video-page__comments_list">
            <li v-for="c in comments" :key="c.id" class="video-page__comments_item">
              <div class="video-page__comments_head">
                <strong class="video-page__comments_author">{{ c.author || 'Аноним' }}</strong>
                <time v-if="c.created_at" class="video-page__comments_time">{{ new Date(c.created_at).toLocaleString() }}</time>
              </div>
              <p class="video-page__comments_text">{{ c.text }}</p>
            </li>
          </ul>
        </section>
      </template>
    </section>
  </template>
  
<script setup lang="ts">
import { computed } from 'vue'

const route = useRoute()
const supabase = useSupabaseClient()

type Json = Record<string, any> | null

interface SubtitleText { th?: string; en?: string; ru?: string }
interface SubtitleItem { id?: number|string; start: number; end: number; text?: SubtitleText | string }

interface VideoItem {
  id: string | number
  title: Json | string
  description?: Json | string | null
  level?: string | null
  video_url?: string | null
  subtitles?: SubtitleItem[] | null
}

const idParam = computed(() => route.params.id as string)

const { data: video, pending: pendingVideo, error: errorVideo } = await useAsyncData<VideoItem | null>(
  () => `video-${idParam.value}`,
  async () => {
    const { data, error } = await supabase
      .from('video_items')
      .select('id, title, description, level, video_url, subtitles')
      .eq('id', idParam.value)
      .maybeSingle()
    if (error) throw error
    return data
  }
)

interface CommentItem { id: string | number; text?: string | null; author?: string | null; created_at?: string | null }
const { data: comments, pending: pendingComments, error: errorComments } = await useAsyncData<CommentItem[]>(
  () => `comments-${idParam.value}`,
  async () => {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('video_id', idParam.value)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data || []
  }
)

const titleText = computed(() => {
  const t = video.value?.title
  if (!t) return ''
  if (typeof t === 'string') return t
  return t.ru || t.en || t.th || ''
})

const descriptionText = computed(() => {
  const d = video.value?.description
  if (!d) return ''
  if (typeof d === 'string') return d
  return d.ru || d.en || d.th || ''
})

const subs = computed<SubtitleItem[]>(() => (video.value?.subtitles || []) as SubtitleItem[])
</script>

<style scoped lang="scss">
.video-page {
  &__state { color: #666; }

  &__header {
    display: flex;
    gap: 12px;
    align-items: baseline;
    margin-bottom: 12px;
  }

  &__title { margin: 0; }

  &__level {
    padding: 4px 8px;
    background: #111;
    color: #fff;
    border-radius: 8px;
    font-size: 12px;
  }

  &__player { margin: auto; width: 50%; }

  &__description { color: #222; }

  &__comments { margin-top: 20px; }
  &__comments_title { font-size: 18px; margin: 0 0 8px; }
  &__comments_list { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; }
  &__comments_item { padding: 10px; border: 1px solid #eee; border-radius: 8px; background: #fafafa; }
  &__comments_head { display: flex; gap: 8px; align-items: baseline; }
  &__comments_author { font-weight: 600; }
  &__comments_time { color: #777; font-size: 12px; }
  &__comments_text { margin: 6px 0 0; }
}
</style>