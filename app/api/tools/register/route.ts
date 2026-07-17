import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin.server'
import { AI_TOOL_API_VERSION, verifyExternalTool } from '@/lib/external-ai-tool.server'

export const runtime = 'nodejs'
export const maxDuration = 30

const PRICING = new Set(['free', 'freemium', 'paid'])
const MARKETS = new Set(['US', 'KR', 'EU', 'Crypto', 'FX', 'Global'])

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function httpsUrl(value: string, label: string): string {
  let url: URL
  try { url = new URL(value) } catch { throw new Error(`${label} 주소가 올바르지 않습니다.`) }
  if (url.protocol !== 'https:') throw new Error(`${label}은 HTTPS 주소만 등록할 수 있습니다.`)
  return url.toString()
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, unknown>
    const email = text(body.email, 320).toLowerCase()
    const name = text(body.name, 60)
    const tagline = text(body.tagline, 120)
    const description = text(body.description, 2000)
    const websiteUrl = httpsUrl(text(body.websiteUrl, 500), '웹사이트')
    const pricing = text(body.pricing, 20)
    const mode = body.mode === 'api' ? 'api' : 'link'
    const supportedMarkets = Array.isArray(body.supportedMarkets)
      ? Array.from(new Set(body.supportedMarkets.map(value => text(value, 20)).filter(value => MARKETS.has(value)))).slice(0, 6)
      : []

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('로그인 이메일을 확인해주세요.')
    if (name.length < 2 || tagline.length < 5 || description.length < 20) throw new Error('도구 설명을 조금 더 자세히 입력해주세요.')
    if (!PRICING.has(pricing)) throw new Error('가격 정책을 선택해주세요.')
    if (!supportedMarkets.length) throw new Error('지원 시장을 하나 이상 선택해주세요.')

    let endpointUrl = ''
    let authToken = ''
    if (mode === 'api') {
      endpointUrl = text(body.endpointUrl, 500)
      authToken = text(body.authToken, 1000)
      if (!endpointUrl) throw new Error('예측 API 주소를 입력해주세요.')
      await verifyExternalTool({ endpointUrl, authToken })
    }

    const admin = getSupabaseAdmin()
    const { data: tool, error: toolError } = await admin.from('ai_tools').insert({
      owner_email: email,
      name,
      tagline,
      description,
      website_url: websiteUrl,
      supported_markets: supportedMarkets,
      pricing,
      integration_type: mode,
      verification_status: mode === 'api' ? 'verified' : 'pending',
      api_version: mode === 'api' ? AI_TOOL_API_VERSION : null,
      is_published: true,
      is_featured: false,
    }).select('*').single()

    if (toolError || !tool) throw new Error(toolError?.message ?? '도구 정보를 저장하지 못했습니다.')

    if (mode === 'api') {
      const { error: integrationError } = await admin.from('ai_tool_integrations').insert({
        tool_id: tool.id,
        owner_email: email,
        endpoint_url: endpointUrl,
        auth_token: authToken || null,
        api_version: AI_TOOL_API_VERSION,
        status: 'verified',
        last_verified_at: new Date().toISOString(),
      })
      if (integrationError) {
        await admin.from('ai_tools').delete().eq('id', tool.id)
        throw new Error('API 보안 정보를 저장하지 못했습니다.')
      }
    }

    return NextResponse.json({
      toolId: tool.id,
      battleReady: mode === 'api',
      message: mode === 'api' ? 'API 검증 완료 — 바로 배틀할 수 있습니다.' : '링크·리뷰 도구가 등록되었습니다.',
    })
  } catch (error) {
    console.error('[tools/register]', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : '등록에 실패했습니다.' }, { status: 400 })
  }
}
