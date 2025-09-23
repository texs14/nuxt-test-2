import { defineEventHandler, setHeaders, setResponseStatus } from 'h3'
import { useRuntimeConfig } from '#imports'

export default defineEventHandler(async (event) => {
  try {
    const jobId = event.context.params?.jobId as string
    if (!jobId) {
      setResponseStatus(event, 400)
      return { error: 'jobId is required' }
    }

    const config = useRuntimeConfig()
    const tgKey = (config as any).transgate?.apiKey
    if (!tgKey) {
      setResponseStatus(event, 500)
      return { error: 'Transgate API key is missing' }
    }

    const res = await fetch(`https://transgate.ai/api/v1/transcriptions/${encodeURIComponent(jobId)}` , {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tgKey}` }
    })

    const text = await res.text()
    setHeaders(event, { 'content-type': res.headers.get('content-type') || 'application/json; charset=utf-8' })
    setResponseStatus(event, res.status)

    try {
      const json: any = JSON.parse(text)

      // Удаляем пробелы только между тайскими символами
      const sanitizeThaiSpacing = (s: string): string => {
        if (!s) return ''
        let out = s
        const re = /([\u0E00-\u0E7F])\s+([\u0E00-\u0E7F])/g
        for (let i = 0; i < 5; i++) {
          const next = out.replace(re, '$1$2')
          if (next === out) break
          out = next
        }
        return out
      }

      const sanitizeSegments = (arr: any[]) => {
        if (!Array.isArray(arr)) return
        for (const seg of arr) {
          if (typeof seg?.text === 'string') seg.text = sanitizeThaiSpacing(seg.text)
          if (typeof seg?.corrected_text === 'string') seg.corrected_text = sanitizeThaiSpacing(seg.corrected_text)
        }
      }

      // Популярные варианты структуры ответа
      if (Array.isArray(json?.result)) sanitizeSegments(json.result)
      if (Array.isArray(json?.results)) sanitizeSegments(json.results)
      if (Array.isArray(json?.segments)) sanitizeSegments(json.segments)
      if (Array.isArray(json?.result?.segments)) sanitizeSegments(json.result.segments)

      return json
    } catch {
      return text
    }
  } catch (err: any) {
    setResponseStatus(event, 500)
    setHeaders(event, { 'content-type': 'application/json; charset=utf-8' })
    return { error: err?.message || 'Transgate status error' }
  }
})
