import { NextRequest, NextResponse } from 'next/server'
import { fetchStockAnalysis } from '@/lib/stocks.server'
import { generateAIPrediction } from '@/lib/claude'
import { getSupabaseServer } from '@/lib/supabase'
import { CURATED_STOCKS } from '@/lib/stocks'
import { DEFAULT_TOOL_ID } from '@/lib/aiTools'

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

    // MVP에서는 서버가 직접 소유한 무료 기본 분석기만 자동 실행한다.
    // 임의 외부 URL 호출은 SSRF 위험 때문에 운영 검증 API가 준비될 때까지 금지한다.
    const selectedToolId = aiToolId ?? DEFAULT_TOOL_ID
    if (selectedToolId !== DEFAULT_TOOL_ID) {
      return NextResponse.json({ error: '아직 자동 배틀이 검증되지 않은 도구입니다.' }, { status: 400 })
    }

    // 종합 분석 데이터 fetch
    const analysis = await fetchStockAnalysis(symbol)
    if (!analysis) {
      return NextResponse.json({ error: '주가 데이터 조회 실패' }, { status: 500 })
    }

    // 외부 AI 비용이 없는 자체 규칙 기반 예측
    const aiPrediction = await generateAIPrediction(analysis)

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
      ai_tool_name: 'AI Battle 기본 분석기',
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
