export const CURATED_STOCKS = [
  { symbol: '005930.KS', name: '삼성전자', market: 'KR' as const },
  { symbol: '000660.KS', name: 'SK하이닉스', market: 'KR' as const },
  { symbol: '035420.KS', name: 'NAVER', market: 'KR' as const },
  { symbol: '035720.KS', name: '카카오', market: 'KR' as const },
  { symbol: 'NVDA', name: 'NVIDIA', market: 'US' as const },
  { symbol: 'AAPL', name: 'Apple', market: 'US' as const },
  { symbol: 'TSLA', name: 'Tesla', market: 'US' as const },
  { symbol: 'META', name: 'Meta', market: 'US' as const },
]

export function formatPrice(price: number, market: 'US' | 'KR'): string {
  if (market === 'KR') {
    return `₩${price.toLocaleString('ko-KR')}`
  }
  return `$${price.toFixed(2)}`
}

export function formatChange(changePercent: number): string {
  const sign = changePercent >= 0 ? '+' : ''
  return `${sign}${changePercent.toFixed(2)}%`
}
