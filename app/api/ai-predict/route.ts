import { NextRequest, NextResponse } from 'next/server'
import { generateAIPrediction } from '@/lib/claude'
import { fetchStockQuote } from '@/lib/stocks.server'
import { getSupabaseServer } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { symbol, roundId } = await req.json() as { symbol: string; roundId?: string }

    if (!symbol) {
      return NextResponse.json({ error: 'symbol required' }, { status: 400 })
    }

    // Fetch current stock data
    const quote = await fetchStockQuote(symbol)
    if (!quote) {
      return NextResponse.json({ error: 'Stock not found' }, { status: 404 })
    }

    // Generate AI prediction via Claude
    const prediction = await generateAIPrediction(quote)

    // If roundId provided, update battle_rounds with AI prediction
    if (roundId) {
      const sb = getSupabaseServer()
      await sb.from('battle_rounds').update({
        ai_prediction: prediction.prediction,
        ai_confidence: prediction.confidence,
        ai_reasoning: prediction.reasoning,
        start_price: quote.price,
      }).eq('id', roundId)
    }

    return NextResponse.json({ ...prediction, quote })
  } catch (err) {
    console.error('[api/ai-predict]', err)
    return NextResponse.json({ error: 'Failed to generate prediction' }, { status: 500 })
  }
}
