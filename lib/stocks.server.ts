import type { StockQuote } from './types'
import { CURATED_STOCKS } from './stocks'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const YahooFinance = require('yahoo-finance2').default
const yf = new YahooFinance() as {
  quote: (symbol: string) => Promise<Record<string, unknown>>
}

export async function fetchStockQuote(symbol: string): Promise<StockQuote | null> {
  try {
    const quote = await yf.quote(symbol)
    const meta = CURATED_STOCKS.find(s => s.symbol === symbol)

    return {
      symbol,
      name: meta?.name ?? (quote.shortName as string) ?? symbol,
      price: (quote.regularMarketPrice as number) ?? 0,
      change: (quote.regularMarketChange as number) ?? 0,
      changePercent: (quote.regularMarketChangePercent as number) ?? 0,
      high52: (quote.fiftyTwoWeekHigh as number) ?? 0,
      low52: (quote.fiftyTwoWeekLow as number) ?? 0,
      volume: (quote.regularMarketVolume as number) ?? 0,
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
