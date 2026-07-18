import { NextRequest, NextResponse } from 'next/server'
import { validatePublicApiUrl } from '@/lib/external-ai-tool.server'

export const runtime = 'nodejs'
export const maxDuration = 15

const MAX_HTML_BYTES = 256 * 1024

function decodeText(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function attribute(tag: string, key: string): string {
  const quoted = tag.match(new RegExp(`${key}\\s*=\\s*(["'])(.*?)\\1`, 'i'))
  if (quoted?.[2]) return quoted[2]
  const plain = tag.match(new RegExp(`${key}\\s*=\\s*([^\\s>]+)`, 'i'))
  return plain?.[1] ?? ''
}

function metaValue(html: string, keys: string[]): string {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? []
  for (const tag of tags) {
    const key = (attribute(tag, 'property') || attribute(tag, 'name')).toLowerCase()
    if (keys.includes(key)) return decodeText(attribute(tag, 'content'))
  }
  return ''
}

async function limitedHtml(response: Response): Promise<string> {
  const reader = response.body?.getReader()
  if (!reader) return (await response.text()).slice(0, MAX_HTML_BYTES)

  const chunks: Uint8Array[] = []
  let size = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > MAX_HTML_BYTES) {
      const remaining = value.slice(0, Math.max(0, MAX_HTML_BYTES - (size - value.byteLength)))
      if (remaining.length) chunks.push(remaining)
      await reader.cancel()
      break
    }
    chunks.push(value)
  }

  const bytes = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0))
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(bytes)
}

function safeImageUrl(value: string, websiteUrl: string): string {
  if (!value) return ''
  try {
    const image = new URL(value, websiteUrl)
    return image.protocol === 'https:' ? image.toString() : ''
  } catch {
    return ''
  }
}

async function fetchPublicPage(startUrl: string, signal: AbortSignal): Promise<{ response: Response; finalUrl: string }> {
  let currentUrl = startUrl
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(currentUrl, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'AI-Battle-Link-Preview/1.0',
      },
      redirect: 'manual',
      cache: 'no-store',
      signal,
    })

    if (response.status < 300 || response.status >= 400) return { response, finalUrl: currentUrl }
    const location = response.headers.get('location')
    if (!location) throw new Error('사이트 이동 주소를 확인할 수 없습니다.')
    currentUrl = await validatePublicApiUrl(new URL(location, currentUrl).toString())
  }
  throw new Error('사이트 이동 횟수가 너무 많습니다.')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { websiteUrl?: unknown }
    if (typeof body.websiteUrl !== 'string') throw new Error('웹사이트 링크를 입력해주세요.')
    const websiteUrl = await validatePublicApiUrl(body.websiteUrl.trim())

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8_000)
    let response: Response
    let finalUrl = websiteUrl
    let html = ''
    try {
      const result = await fetchPublicPage(websiteUrl, controller.signal)
      response = result.response
      finalUrl = result.finalUrl

      if (!response.ok) throw new Error(`사이트가 HTTP ${response.status}로 응답했습니다.`)
      const contentType = response.headers.get('content-type') ?? ''
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
        throw new Error('웹페이지 형식의 링크만 불러올 수 있습니다.')
      }
      html = await limitedHtml(response)
    } finally {
      clearTimeout(timeout)
    }
    const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)
    const title = metaValue(html, ['og:site_name', 'og:title', 'twitter:title']) || decodeText(titleMatch?.[1] ?? '')
    const description = metaValue(html, ['description', 'og:description', 'twitter:description'])
    const hostname = new URL(finalUrl).hostname.replace(/^www\./, '')

    return NextResponse.json({
      name: (title || hostname).slice(0, 60),
      tagline: (description || `${title || hostname} AI investing tool`).slice(0, 120),
      description: description.slice(0, 1000),
      logoUrl: safeImageUrl(metaValue(html, ['og:image', 'twitter:image']), finalUrl),
    })
  } catch (error) {
    const message = error instanceof Error && error.name === 'AbortError'
      ? '사이트가 8초 안에 응답하지 않았습니다.'
      : error instanceof Error ? error.message : '사이트 정보를 불러오지 못했습니다.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
