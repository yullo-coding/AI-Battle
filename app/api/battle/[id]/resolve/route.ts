import { NextRequest, NextResponse } from 'next/server'
import { fetchClosingPriceForDate } from '@/lib/stocks.server'
import { getSupabaseServer } from '@/lib/supabase'
import type { Battle } from '@/lib/types'

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

    // end_date 도달 여부 확인
    const today = new Date().toISOString().split('T')[0]
    if (today < b.end_date) {
      return NextResponse.json({ error: '아직 결과 날짜가 되지 않았습니다' }, { status: 400 })
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
