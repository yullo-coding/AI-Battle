import { NextRequest, NextResponse } from 'next/server'
import { fetchClosingPriceForDate } from '@/lib/stocks.server'
import { getSupabaseServer } from '@/lib/supabase'
import type { Battle } from '@/lib/types'
import { canResolveBattle } from '@/lib/marketTime'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sb = getSupabaseServer()

    const { data: battle, error: fetchErr } = await sb
      .from('battles')
      .select('*')
      .eq('id', params.id)
      .single()

    if (fetchErr || !battle) {
      return NextResponse.json({ error: '배틀 없음' }, { status: 404 })
    }

    const b = battle as Battle

    if (b.status === 'resolved') {
      return NextResponse.json({ already: true, battle: b })
    }

    // 거래소 장 마감 데이터가 공개된 뒤에만 판정한다.
    if (!canResolveBattle(b.end_date, b.stock_market)) {
      return NextResponse.json({ error: '아직 장 마감 전입니다' }, { status: 400 })
    }

    // 해당 날짜 종가 조회
    const endPrice = await fetchClosingPriceForDate(b.stock_symbol, b.end_date)
    if (!endPrice) {
      return NextResponse.json({ error: '종가 데이터 조회 실패' }, { status: 500 })
    }

    const actualChangePercent = parseFloat(
      (((endPrice - b.start_price) / b.start_price) * 100).toFixed(2)
    )
    const userError = b.user_change_percent != null
      ? parseFloat(Math.abs(b.user_change_percent - actualChangePercent).toFixed(2))
      : null
    const aiError = b.ai_change_percent != null
      ? parseFloat(Math.abs(b.ai_change_percent - actualChangePercent).toFixed(2))
      : null

    let winner: 'USER' | 'AI' | 'TIE' = 'TIE'
    if (userError != null && aiError != null) {
      if (userError < aiError) winner = 'USER'
      else if (aiError < userError) winner = 'AI'
      else winner = 'TIE'
    }

    const { data: updated, error: updateErr } = await sb
      .from('battles')
      .update({
        end_price: endPrice,
        actual_change_percent: actualChangePercent,
        user_error: userError,
        ai_error: aiError,
        winner,
        status: 'resolved',
      })
      .eq('id', params.id)
      .select()
      .single()

    if (updateErr) {
      return NextResponse.json({ error: '업데이트 실패' }, { status: 500 })
    }

    return NextResponse.json({ battle: updated })
  } catch (err) {
    console.error('[resolve]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
