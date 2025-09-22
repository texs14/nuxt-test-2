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
      return JSON.parse(text)
    } catch {
      return text
    }
  } catch (err: any) {
    setResponseStatus(event, 500)
    setHeaders(event, { 'content-type': 'application/json; charset=utf-8' })
    return { error: err?.message || 'Transgate status error' }
  }
})
