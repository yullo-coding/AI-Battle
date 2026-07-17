import { NextRequest, NextResponse } from 'next/server'
import { searchStocks } from '@/lib/stocks.server'

export const runtime = 'nodejs'
export const maxDuration = 10

export async function GET(req: NextRequest) {
  const query = new URL(req.url).searchParams.get('q')?.trim() ?? ''
  if (query.length < 2) return NextResponse.json([])

  try {
    const results = await searchStocks(query)
    return NextResponse.json(results, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    })
  } catch (error) {
    console.error('[api/stocks/search]', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
