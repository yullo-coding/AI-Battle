export type Direction = 'UP' | 'DOWN'
export type BattleStatus = 'active' | 'ended'
export type PredictionResult = 'WIN' | 'LOSE' | null

export interface BattleRound {
  id: string
  stock_symbol: string
  stock_name: string
  stock_market: 'US' | 'KR'
  start_price: number | null
  end_price: number | null
  start_at: string
  end_at: string
  status: BattleStatus
  ai_prediction: Direction | null
  ai_confidence: number | null
  ai_reasoning: string | null
  created_at: string
}

export interface BattlePrediction {
  id: string
  round_id: string
  phone: string
  nickname: string | null
  prediction: Direction
  period_days: number
  result: PredictionResult
  created_at: string
}

export interface UserSession {
  phone: string
  nickname: string
}

export interface StockQuote {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  high52: number
  low52: number
  volume: number
  market: 'US' | 'KR'
}
