import type { StockAnalysis, StockQuote } from './types'
import { CURATED_STOCKS } from './stocks'
import {
  calculateRSI, calculateMACD, calculateBollingerBands, calculateMA,
} from './indicators'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const YahooFinance = require('yahoo-finance2').default
const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] }) as {
  quote: (symbol: string) => Promise<Record<string, unknown>>
  chart: (symbol: string, opts: Record<string, unknown>) => Promise<{
    quotes: Array<{ date: Date; open: number; high: number; low: number; close: number; volume: number }>
  }>
  quoteSummary: (symbol: string, opts: Record<string, unknown>) => Promise<Record<string, unknown>>
  insights: (symbol: string) => Promise<Record<string, unknown>>
}

// ─── 기본 현재가 조회 ───────────────────────────────────────
export async function fetchStockQuote(symbol: string): Promise<StockQuote | null> {
  try {
    const q = await yf.quote(symbol)
    const meta = CURATED_STOCKS.find(s => s.symbol === symbol)
    return {
      symbol,
      name: meta?.name ?? (q.shortName as string) ?? symbol,
      price: (q.regularMarketPrice as number) ?? 0,
      change: (q.regularMarketChange as number) ?? 0,
      changePercent: (q.regularMarketChangePercent as number) ?? 0,
      open: (q.regularMarketOpen as number) ?? 0,
      high: (q.regularMarketDayHigh as number) ?? 0,
      low: (q.regularMarketDayLow as number) ?? 0,
      high52: (q.fiftyTwoWeekHigh as number) ?? 0,
      low52: (q.fiftyTwoWeekLow as number) ?? 0,
      volume: (q.regularMarketVolume as number) ?? 0,
      avgVolume: (q.averageDailyVolume3Month as number) ?? 0,
      market: meta?.market ?? 'US',
    }
  } catch (err) {
    console.error(`[stocks] quote ${symbol}:`, err)
    return null
  }
}

export async function fetchMultipleQuotes(symbols: string[]): Promise<StockQuote[]> {
  const results = await Promise.allSettled(symbols.map(fetchStockQuote))
  return results
    .filter((r): r is PromiseFulfilledResult<StockQuote> => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value)
}

// ─── Fear & Greed ────────────────────────────────────────────
async function fetchFearGreed(): Promise<{ value: number; label: string } | null> {
  try {
    const res = await fetch('https://api.alternative.me/fng/?limit=1', {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    const json = await res.json() as { data: Array<{ value: string; value_classification: string }> }
    const item = json.data?.[0]
    if (!item) return null
    return { value: parseInt(item.value), label: item.value_classification }
  } catch {
    return null
  }
}

// 타임아웃 래퍼
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms)
    ),
  ])
}

// ─── 종합 분석 (Step 3 대시보드용) ──────────────────────────
export async function fetchStockAnalysis(symbol: string): Promise<StockAnalysis | null> {
  try {
    // 병렬 fetch — insights는 느릴 수 있으므로 5초 타임아웃
    const [quote, chartData, summaryData, insightsData, fearGreed] = await Promise.allSettled([
      fetchStockQuote(symbol),
      yf.chart(symbol, {
        period1: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        interval: '1d',
      }),
      withTimeout(
        yf.quoteSummary(symbol, { modules: ['financialData', 'recommendationTrend'] }),
        8000
      ),
      withTimeout(yf.insights(symbol), 5000),
      fetchFearGreed(),
    ])

    const q = quote.status === 'fulfilled' ? quote.value : null
    if (!q) return null

    // 종가 배열 추출
    let closes: number[] = []
    if (chartData.status === 'fulfilled' && chartData.value?.quotes) {
      closes = chartData.value.quotes
        .map((d) => d.close)
        .filter((v): v is number => typeof v === 'number' && !isNaN(v))
    }

    // 기술적 지표 계산
    const rsi14 = closes.length > 15 ? calculateRSI(closes) : 50
    const macd = closes.length > 26 ? calculateMACD(closes) : { macd: 0, signal: 0, histogram: 0 }
    const bollinger = closes.length > 20 ? calculateBollingerBands(closes) : {
      upper: q.price * 1.05, middle: q.price, lower: q.price * 0.95
    }
    const ma20 = closes.length > 20 ? calculateMA(closes, 20) : q.price
    const ma50 = closes.length > 50 ? calculateMA(closes, 50) : q.price

    // 전문가 분석
    let analystTargetPrice: number | null = null
    let analystRecommendation: string | null = null
    let analystCount: number | null = null
    let analystBuyCount: number | null = null
    let analystHoldCount: number | null = null
    let analystSellCount: number | null = null

    if (summaryData.status === 'fulfilled' && summaryData.value) {
      const fd = (summaryData.value as Record<string, unknown>).financialData as Record<string, unknown> | undefined
      if (fd) {
        analystTargetPrice = (fd.targetMeanPrice as number) ?? null
        analystRecommendation = (fd.recommendationKey as string) ?? null
        analystCount = (fd.numberOfAnalystOpinions as number) ?? null
      }
      const rt = (summaryData.value as Record<string, unknown>).recommendationTrend as Record<string, unknown> | undefined
      if (rt) {
        const trend = (rt.trend as Array<Record<string, number>>)?.[0]
        if (trend) {
          analystBuyCount = (trend.strongBuy ?? 0) + (trend.buy ?? 0)
          analystHoldCount = trend.hold ?? 0
          analystSellCount = (trend.sell ?? 0) + (trend.strongSell ?? 0)
        }
      }
    }

    // 뉴스 (insights sigDevs)
    const recentNews: Array<{ headline: string; date: string }> = []
    if (insightsData.status === 'fulfilled' && insightsData.value) {
      const sigDevs = (insightsData.value as Record<string, unknown>).sigDevs as Array<Record<string, unknown>> | undefined
      if (Array.isArray(sigDevs)) {
        sigDevs.slice(0, 3).forEach(d => {
          recentNews.push({
            headline: String(d.headline ?? ''),
            date: d.date ? new Date(d.date as string).toLocaleDateString('ko-KR') : '',
          })
        })
      }
    }

    // Fear & Greed
    const fg = fearGreed.status === 'fulfilled' ? fearGreed.value : null

    return {
      quote: q,
      rsi14,
      macd,
      bollinger,
      ma20: parseFloat(ma20.toFixed(2)),
      ma50: parseFloat(ma50.toFixed(2)),
      analystTargetPrice,
      analystRecommendation,
      analystCount,
      analystBuyCount,
      analystHoldCount,
      analystSellCount,
      fearGreedValue: fg?.value ?? null,
      fearGreedLabel: fg?.label ?? null,
      recentNews,
    }
  } catch (err) {
    console.error(`[stocks] analysis ${symbol}:`, err)
    return null
  }
}

// ─── 특정 날짜 종가 (결과 확정용) ───────────────────────────
export async function fetchClosingPriceForDate(symbol: string, date: string): Promise<number | null> {
  try {
    const from = new Date(date)
    const to = new Date(date)
    to.setDate(to.getDate() + 5) // 공휴일 대비 여유

    const chart = await yf.chart(symbol, {
      period1: from.toISOString().split('T')[0],
      period2: to.toISOString().split('T')[0],
      interval: '1d',
    })

    const quotes = chart?.quotes?.filter((q) => q.close != null)
    if (!quotes?.length) return null

    // 요청 날짜 이후 첫 번째 영업일 종가
    return quotes[0].close
  } catch (err) {
    console.error(`[stocks] closingPrice ${symbol} ${date}:`, err)
    return null
  }
}
