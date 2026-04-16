import { NextRequest, NextResponse } from 'next/server'
import { fetchMultipleQuotes, fetchStockQuote } from '@/lib/stocks.server'
import { CURATED_STOCKS } from '@/lib/stocks'

export const runtime = 'nodejs'
export const revalidate = 60 // cache 1 minute

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get('symbol')

  try {
    if (symbol) {
      const quote = await fetchStockQuote(symbol)
      if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json(quote)
    }

    const symbols = CURATED_STOCKS.map(s => s.symbol)
    const quotes = await fetchMultipleQuotes(symbols)
    return NextResponse.json(quotes)
  } catch (err) {
    console.error('[api/stocks]', err)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}
