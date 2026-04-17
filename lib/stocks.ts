export const CURATED_STOCKS = [
  { symbol: '005930.KS', name: '삼성전자', market: 'KR' as const },
  { symbol: 'NVDA',      name: 'NVIDIA',   market: 'US' as const },
  { symbol: 'GOOGL',     name: 'Alphabet', market: 'US' as const },
]

export function formatPrice(price: number, market: 'US' | 'KR'): string {
  if (market === 'KR') return `₩${price.toLocaleString('ko-KR')}`
  return `$${price.toFixed(2)}`
}

export function formatChange(changePercent: number): string {
  const sign = changePercent >= 0 ? '+' : ''
  return `${sign}${changePercent.toFixed(2)}%`
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}
