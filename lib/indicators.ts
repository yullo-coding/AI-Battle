// 순수 함수 — 60일치 일봉 close 배열을 받아 기술적 지표 계산

export function calculateMA(closes: number[], period: number): number {
  if (closes.length < period) return closes[closes.length - 1] ?? 0
  const slice = closes.slice(-period)
  return slice.reduce((a, b) => a + b, 0) / period
}

export function calculateRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50

  let gains = 0
  let losses = 0

  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1]
    if (diff > 0) gains += diff
    else losses += Math.abs(diff)
  }

  const avgGain = gains / period
  const avgLoss = losses / period

  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return Math.round(100 - 100 / (1 + rs))
}

function calculateEMA(closes: number[], period: number): number[] {
  const k = 2 / (period + 1)
  const emas: number[] = []
  let ema = closes[0]
  for (let i = 0; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k)
    emas.push(ema)
  }
  return emas
}

export function calculateMACD(closes: number[]): {
  macd: number
  signal: number
  histogram: number
} {
  if (closes.length < 26) return { macd: 0, signal: 0, histogram: 0 }

  const ema12 = calculateEMA(closes, 12)
  const ema26 = calculateEMA(closes, 26)

  const macdLine = ema12.map((v, i) => v - ema26[i])
  const signalLine = calculateEMA(macdLine, 9)

  const last = macdLine.length - 1
  const macd = parseFloat(macdLine[last].toFixed(4))
  const signal = parseFloat(signalLine[last].toFixed(4))
  const histogram = parseFloat((macd - signal).toFixed(4))

  return { macd, signal, histogram }
}

export function calculateBollingerBands(
  closes: number[],
  period = 20
): { upper: number; middle: number; lower: number } {
  if (closes.length < period) {
    const last = closes[closes.length - 1]
    return { upper: last, middle: last, lower: last }
  }

  const slice = closes.slice(-period)
  const middle = slice.reduce((a, b) => a + b, 0) / period
  const variance = slice.reduce((a, b) => a + Math.pow(b - middle, 2), 0) / period
  const stdDev = Math.sqrt(variance)

  return {
    upper: parseFloat((middle + 2 * stdDev).toFixed(2)),
    middle: parseFloat(middle.toFixed(2)),
    lower: parseFloat((middle - 2 * stdDev).toFixed(2)),
  }
}

// 볼린저 밴드 내 현재가 위치 레이블
export function bollingerPosition(
  price: number,
  bands: { upper: number; middle: number; lower: number }
): string {
  if (price >= bands.upper) return '상단 돌파 (과열)'
  if (price >= bands.middle) return '중간~상단 (강세)'
  if (price >= bands.lower) return '중간~하단 (약세)'
  return '하단 이탈 (과매도)'
}

// RSI 상태 레이블
export function rsiLabel(rsi: number): string {
  if (rsi >= 70) return '과매수'
  if (rsi >= 60) return '강세'
  if (rsi >= 40) return '중립'
  if (rsi >= 30) return '약세'
  return '과매도'
}

// MACD 신호 레이블
export function macdSignal(histogram: number): string {
  if (histogram > 0.5) return '강한 매수'
  if (histogram > 0) return '매수 신호'
  if (histogram > -0.5) return '매도 신호'
  return '강한 매도'
}
