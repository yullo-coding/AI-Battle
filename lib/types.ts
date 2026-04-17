// ─── 배틀 ────────────────────────────────────────────────────
export interface Battle {
  id: string
  phone: string

  stock_symbol: string
  stock_name: string
  stock_market: 'US' | 'KR'
  start_price: number

  end_date: string   // 'YYYY-MM-DD'

  user_change_percent: number | null   // +4.5 = +4.5%, -3.2 = -3.2%

  ai_change_percent: number | null
  ai_confidence: number | null
  ai_reasoning: string | null          // JSON 문자열

  end_price: number | null
  actual_change_percent: number | null
  user_error: number | null
  ai_error: number | null
  winner: 'USER' | 'AI' | 'TIE' | null

  status: 'pending' | 'resolved'
  created_at: string
}

// AI reasoning JSON 파싱 결과
export interface AIReasoning {
  technical: string
  sentiment: string
  risk: string
  conclusion: string
}

// ─── 주가 ────────────────────────────────────────────────────
export interface StockQuote {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  open: number
  high: number
  low: number
  high52: number
  low52: number
  volume: number
  avgVolume: number
  market: 'US' | 'KR'
}

// 종합 지표 (Step 3 대시보드용)
export interface StockAnalysis {
  quote: StockQuote

  // 기술적 지표 (60일 차트 계산)
  rsi14: number
  macd: { macd: number; signal: number; histogram: number }
  bollinger: { upper: number; middle: number; lower: number }
  ma20: number
  ma50: number

  // 전문가 분석
  analystTargetPrice: number | null
  analystRecommendation: string | null   // 'buy' | 'hold' | 'sell' 등
  analystCount: number | null
  analystBuyCount: number | null
  analystHoldCount: number | null
  analystSellCount: number | null

  // 시장 심리
  fearGreedValue: number | null          // 0~100
  fearGreedLabel: string | null          // 'Extreme Fear' 등
  recentNews: Array<{ headline: string; date: string }>
}

// ─── 세션 ────────────────────────────────────────────────────
export interface UserSession {
  phone: string
  nickname: string
}
