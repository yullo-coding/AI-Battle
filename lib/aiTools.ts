import { getSupabase } from './supabase'
import type { AITool, AIToolReview } from './types'

export const DEFAULT_TOOL_ID = '00000000-0000-4000-8000-000000000001'

export const DEFAULT_AI_TOOL: AITool = {
  id: DEFAULT_TOOL_ID,
  owner_email: 'system@ai-battle.local',
  name: 'AI Battle 기본 분석기',
  tagline: '기술적 지표를 조합해 설명 가능한 예측을 만드는 무료 도구',
  description: 'RSI, MACD, 볼린저 밴드, 이동평균선과 시장 심리를 점수화합니다. 외부 유료 AI 호출 없이 작동하며 각 판단 근거를 공개합니다.',
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
      sb.from('ai_tools').select('*').eq('is_published', true).order('is_featured', { ascending: false }).order('created_at', { ascending: false }),
      sb.from('ai_tool_likes').select('tool_id'),
      sb.from('ai_tool_reviews').select('tool_id,rating'),
    ]))
  } catch {
    return [DEFAULT_AI_TOOL]
  }
  const [{ data: tools, error }, { data: likes }, { data: reviews }] = results
  if (error || !tools) return [DEFAULT_AI_TOOL]

  return tools.map(tool => {
    const toolLikes = likes?.filter(row => row.tool_id === tool.id).length ?? 0
    const toolReviews = reviews?.filter(row => row.tool_id === tool.id) ?? []
    const average = toolReviews.length
      ? toolReviews.reduce((sum, row) => sum + Number(row.rating), 0) / toolReviews.length
      : null
    return {
      ...tool,
      like_count: toolLikes,
      review_count: toolReviews.length,
      average_rating: average,
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
      sb.from('ai_tool_reviews').select('*').eq('tool_id', id).order('created_at', { ascending: false })
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
