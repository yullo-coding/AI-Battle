import type { StockQuote } from './types'
import { CURATED_STOCKS } from './stocks'

export async function fetchStockQuote(symbol: string): Promise<StockQuote | null> {
  try {
    const yahooFinance = (await import('yahoo-finance2')).default
    const quote = await yahooFinance.quote(symbol)
    const meta = CURATED_STOCKS.find(s => s.symbol === symbol)

    return {
      symbol,
      name: meta?.name ?? (quote as { shortName?: string }).shortName ?? symbol,
      price: (quote as { regularMarketPrice?: number }).regularMarketPrice ?? 0,
      change: (quote as { regularMarketChange?: number }).regularMarketChange ?? 0,
      changePercent: (quote as { regularMarketChangePercent?: number }).regularMarketChangePercent ?? 0,
      high52: (quote as { fiftyTwoWeekHigh?: number }).fiftyTwoWeekHigh ?? 0,
      low52: (quote as { fiftyTwoWeekLow?: number }).fiftyTwoWeekLow ?? 0,
      volume: (quote as { regularMarketVolume?: number }).regularMarketVolume ?? 0,
      market: meta?.market ?? 'US',
    }
  } catch (err) {
    console.error(`[stocks] fetchQuote ${symbol}:`, err)
    return null
  }
}

export async function fetchMultipleQuotes(symbols: string[]): Promise<StockQuote[]> {
  const results = await Promise.allSettled(symbols.map(fetchStockQuote))
  return results
    .filter((r): r is PromiseFulfilledResult<StockQuote> => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value)
}
