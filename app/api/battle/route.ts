import { NextRequest, NextResponse } from 'next/server'
import { fetchStockAnalysis } from '@/lib/stocks.server'
import { generateAIPrediction, type AIPrediction } from '@/lib/claude'
import { getSupabaseServer } from '@/lib/supabase'
import { CURATED_STOCKS } from '@/lib/stocks'
import { DEFAULT_TOOL_ID } from '@/lib/aiTools'
import { getSupabaseAdmin } from '@/lib/supabase-admin.server'
import { callExternalTool } from '@/lib/external-ai-tool.server'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const { email, symbol, endDate, userChangePercent, aiToolId } = await req.json() as {
      email: string
      symbol: string
      endDate: string
      userChangePercent: number
      aiToolId?: string
    }

    if (!email || !symbol || !endDate || userChangePercent === undefined) {
      return NextResponse.json({ error: '필수 필드 누락' }, { status: 400 })
    }

    const stock = CURATED_STOCKS.find(s => s.symbol === symbol)
    if (!stock) {
      return NextResponse.json({ error: '지원하지 않는 종목' }, { status: 400 })
    }

    const selectedToolId = aiToolId ?? DEFAULT_TOOL_ID

    const analysis = await fetchStockAnalysis(symbol)
    if (!analysis) {
      return NextResponse.json({ error: '주가 데이터 조회 실패' }, { status: 500 })
    }

    let selectedToolName = 'AI Battle 기본 분석기'
    let aiPrediction: AIPrediction

    if (selectedToolId === DEFAULT_TOOL_ID) {
      // 외부 AI 비용이 없는 자체 규칙 기반 예측
      aiPrediction = await generateAIPrediction(analysis)
    } else {
      const admin = getSupabaseAdmin()
      const [{ data: tool }, { data: integration }] = await Promise.all([
        admin.from('ai_tools')
          .select('id,name,integration_type,verification_status')
          .eq('id', selectedToolId)
          .eq('integration_type', 'api')
          .eq('verification_status', 'verified')
          .maybeSingle(),
        admin.from('ai_tool_integrations')
          .select('endpoint_url,auth_token,status')
          .eq('tool_id', selectedToolId)
          .eq('status', 'verified')
          .maybeSingle(),
      ])

      if (!tool || !integration) {
        return NextResponse.json({ error: '배틀 연결이 검증되지 않은 AI 도구입니다.' }, { status: 400 })
      }

      selectedToolName = tool.name
      try {
        aiPrediction = await callExternalTool({
          endpointUrl: integration.endpoint_url,
          authToken: integration.auth_token,
        }, {
          symbol,
          stockName: stock.name,
          market: stock.market,
          endDate,
          analysis,
        })
        const currentUsage = await admin.from('ai_tool_integrations').select('call_count').eq('tool_id', selectedToolId).single()
        await admin.from('ai_tool_integrations').update({
          last_called_at: new Date().toISOString(),
          call_count: Number(currentUsage.data?.call_count ?? 0) + 1,
          last_error: null,
          updated_at: new Date().toISOString(),
        }).eq('tool_id', selectedToolId)
      } catch (toolError) {
        const message = toolError instanceof Error ? toolError.message : '제작자 API 호출 실패'
        const current = await admin.from('ai_tool_integrations').select('failure_count').eq('tool_id', selectedToolId).single()
        await admin.from('ai_tool_integrations').update({
          failure_count: Number(current.data?.failure_count ?? 0) + 1,
          last_error: message.slice(0, 500),
          updated_at: new Date().toISOString(),
        }).eq('tool_id', selectedToolId)
        return NextResponse.json({ error: `${selectedToolName} 연결 실패: ${message}` }, { status: 502 })
      }
    }

    // Supabase에 저장
    const sb = getSupabaseServer()
    const { data, error } = await sb.from('battles').insert({
      email,
      stock_symbol: symbol,
      stock_name: stock.name,
      stock_market: stock.market,
      start_price: analysis.quote.price,
      end_date: endDate,
      user_change_percent: userChangePercent,
      ai_change_percent: aiPrediction.change_percent,
      ai_confidence: aiPrediction.confidence,
      ai_reasoning: JSON.stringify({
        brief: aiPrediction.brief,
        ...aiPrediction.reasoning,
      }),
      ai_tool_id: selectedToolId,
      ai_tool_name: selectedToolName,
    }).select().single()

    if (error) {
      console.error('[battle] insert:', error)
      return NextResponse.json({ error: '배틀 저장 실패' }, { status: 500 })
    }

    return NextResponse.json({
      battle: data,
      aiPrediction,
      mode: aiPrediction.mode,
    })
  } catch (err) {
    console.error('[battle] POST:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
