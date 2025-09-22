import { defineEventHandler, readBody, setHeaders, setResponseStatus } from 'h3'
import { useRuntimeConfig } from '#imports'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig()
    const supabaseUrl = config.public?.supabase?.url
    const supabaseKey = (config as any).supabaseServiceKey || config.public?.supabase?.key
    if (!supabaseUrl || !supabaseKey) throw new Error('Supabase конфигурация отсутствует')
    const supabase = createClient(supabaseUrl, supabaseKey)

    const body = await readBody<any>(event)
    const allowedLevels = ['A1','A2','B1','B2','C1','C2']
    if (!body || !body.id || !body.preview_url || !body.video_url || !body.subtitles || !body.title || !body.description || !body.level || !body.duration) {
      setResponseStatus(event, 400)
      return { error: 'Некорректное тело запроса: требуются поля id, preview_url, video_url, title, description, level, duration, subtitles' }
    }
    if (!allowedLevels.includes(body.level)) {
      setResponseStatus(event, 400)
      return { error: `Недопустимое значение level. Разрешены: ${allowedLevels.join(', ')}` }
    }

    const title = typeof body.title === 'object' ? body.title : { ru: String(body.title || '') }
    const description = typeof body.description === 'object' ? body.description : { ru: String(body.description || '') }
    const seconds = Number(body.duration?.seconds ?? 0)
    const hhmmss = (total: number) => {
      const s = Math.max(0, Math.floor(total))
      const hh = Math.floor(s / 3600).toString().padStart(2, '0')
      const mm = Math.floor((s % 3600) / 60).toString().padStart(2, '0')
      const ss = (s % 60).toString().padStart(2, '0')
      return `${hh}:${mm}:${ss}`
    }
    const duration = { seconds, text: hhmmss(seconds) }

    const payload = {
      id: String(body.id),
      preview_url: String(body.preview_url),
      video_url: String(body.video_url),
      title,
      description,
      level: String(body.level),
      duration,
      subtitles: body.subtitles,
      comments_json_legacy: [] as any[]
    }

    const { data, error } = await supabase
      .from('video_items')
      .insert(payload)
      .select('id')
      .single()

    if (error) throw error

    setHeaders(event, { 'content-type': 'application/json; charset=utf-8' })
    setResponseStatus(event, 200)
    return { ok: true, id: data?.id }
  } catch (err: any) {
    setResponseStatus(event, 500)
    setHeaders(event, { 'content-type': 'application/json; charset=utf-8' })
    return { error: err?.message || 'Save error' }
  }
})
