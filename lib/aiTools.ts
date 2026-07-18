import { getSupabase } from './supabase'
import type { AITool, AIToolReview } from './types'
import type { Locale } from '@/components/LocaleProvider'

export const DEFAULT_TOOL_ID = '00000000-0000-4000-8000-000000000001'

export const DEFAULT_AI_TOOL: AITool = {
  id: DEFAULT_TOOL_ID,
  name: 'AI Battle 기본 분석기',
  name_en: 'AI Battle Core Analyzer',
  tagline: '기술적 지표를 조합해 설명 가능한 예측을 만드는 무료 도구',
  tagline_en: 'A free, explainable predictor built from technical indicators',
  description: 'RSI, MACD, 볼린저 밴드, 이동평균선과 시장 심리를 점수화합니다. 외부 유료 AI 호출 없이 작동하며 각 판단 근거를 공개합니다.',
  description_en: 'Scores RSI, MACD, Bollinger Bands, moving averages, and market sentiment. It runs without paid external AI calls and explains each signal behind its prediction.',
  website_url: 'https://ai-battle-gamma.vercel.app',
  logo_url: null,
  supported_markets: ['US', 'KR'],
  pricing: 'free',
  integration_type: 'built_in',
  verification_status: 'verified',
  api_version: null,
  is_published: true,
  is_featured: true,
  created_at: '',
  updated_at: '',
  like_count: 0,
  review_count: 0,
  average_rating: null,
}

function withTimeout<T>(promise: PromiseLike<T>, ms = 4000): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ])
}

export async function fetchAITools(): Promise<AITool[]> {
  const sb = getSupabase()
  if (!sb) return []

  let results
  try {
    results = await withTimeout(Promise.all([
      sb.from('public_ai_tools').select('*').order('is_featured', { ascending: false }).order('created_at', { ascending: false }),
      sb.from('ai_tool_public_stats').select('tool_id,like_count,review_count,average_rating'),
    ]))
  } catch {
    return [DEFAULT_AI_TOOL]
  }
  const [{ data: tools, error }, { data: stats }] = results
  if (error || !tools) return [DEFAULT_AI_TOOL]

  return tools.map(tool => {
    const toolStats = stats?.find(row => row.tool_id === tool.id)
    return {
      ...tool,
      like_count: Number(toolStats?.like_count ?? 0),
      review_count: Number(toolStats?.review_count ?? 0),
      average_rating: toolStats?.average_rating == null ? null : Number(toolStats.average_rating),
    } as AITool
  })
}

export async function fetchAITool(id: string): Promise<{ tool: AITool; reviews: AIToolReview[] }> {
  const tools = await fetchAITools()
  const tool = tools.find(item => item.id === id)
  if (!tool) throw new Error('도구를 찾을 수 없습니다.')

  const sb = getSupabase()
  if (!sb) return { tool, reviews: [] }
  let reviewResult
  try {
    reviewResult = await withTimeout(
      sb.from('public_ai_tool_reviews').select('*').eq('tool_id', id).order('created_at', { ascending: false })
    )
  } catch {
    return { tool, reviews: [] }
  }
  const { data, error } = reviewResult
  if (error) return { tool, reviews: [] }
  return { tool, reviews: (data ?? []) as AIToolReview[] }
}

export function toolAvailability(tool: AITool) {
  if (tool.integration_type === 'built_in') return { label: '바로 배틀 가능', battleReady: true }
  if (tool.integration_type === 'api' && tool.verification_status === 'verified') {
    return { label: '연동 검증 완료', battleReady: true }
  }
  return { label: '링크·리뷰 전용', battleReady: false }
}

export function localizedTool(tool: AITool, locale: Locale) {
  return {
    name: locale === 'en' && tool.name_en ? tool.name_en : tool.name,
    tagline: locale === 'en' && tool.tagline_en ? tool.tagline_en : tool.tagline,
    description: locale === 'en' && tool.description_en ? tool.description_en : tool.description,
  }
}

export function localizedBattleToolName(toolId: string | null, storedName: string | null, locale: Locale) {
  if (toolId === DEFAULT_TOOL_ID) return locale === 'en' ? DEFAULT_AI_TOOL.name_en! : DEFAULT_AI_TOOL.name
  return storedName || (locale === 'en' ? 'AI tool' : 'AI 도구')
}
