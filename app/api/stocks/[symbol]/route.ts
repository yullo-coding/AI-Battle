import { NextRequest, NextResponse } from 'next/server'
import { fetchStockAnalysis } from '@/lib/stocks.server'
import { CURATED_STOCKS } from '@/lib/stocks'

export async function GET(
  _req: NextRequest,
  { params }: { params: { symbol: string } }
) {
  const symbol = params.symbol
  if (!CURATED_STOCKS.find(s => s.symbol === symbol)) {
    return NextResponse.json({ error: 'Unknown symbol' }, { status: 400 })
  }

  const analysis = await fetchStockAnalysis(symbol)
  if (!analysis) {
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }

  return NextResponse.json(analysis)
}
