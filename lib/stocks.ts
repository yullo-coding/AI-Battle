export const CURATED_STOCKS = [
  { symbol: '005930.KS', name: '삼성전자', market: 'KR' as const },
  { symbol: '000660.KS', name: 'SK하이닉스', market: 'KR' as const },
  { symbol: '035420.KS', name: 'NAVER', market: 'KR' as const },
  { symbol: '035720.KS', name: '카카오', market: 'KR' as const },
  { symbol: 'NVDA', name: 'NVIDIA', market: 'US' as const },
  { symbol: 'GOOGL', name: 'Alphabet', market: 'US' as const },
  { symbol: 'AAPL', name: 'Apple', market: 'US' as const },
  { symbol: 'TSLA', name: 'Tesla', market: 'US' as const },
  { symbol: 'MSFT', name: 'Microsoft', market: 'US' as const },
  { symbol: 'AMZN', name: 'Amazon', market: 'US' as const },
]

export function inferStockMarket(symbol: string, currency?: unknown): 'US' | 'KR' {
  return symbol.endsWith('.KS') || symbol.endsWith('.KQ') || currency === 'KRW' ? 'KR' : 'US'
}

export function isSupportedStockSymbol(symbol: string): boolean {
  if (!/^[A-Z0-9.-]{1,24}$/.test(symbol)) return false
  const dotIndex = symbol.indexOf('.')
  return dotIndex === -1 || symbol.endsWith('.KS') || symbol.endsWith('.KQ')
}

export function formatPrice(price: number, market: 'US' | 'KR'): string {
  if (market === 'KR') return `₩${price.toLocaleString('ko-KR')}`
  return `$${price.toFixed(2)}`
}

export function formatPriceWithCurrency(
  price: number,
  market: 'US' | 'KR',
  currency: 'KRW' | 'USD',
  usdKrwRate: number | null
): string {
  if (market === 'KR') return `₩${Math.round(price).toLocaleString('ko-KR')}`
  if (currency === 'KRW' && usdKrwRate) {
    return `₩${Math.round(price * usdKrwRate).toLocaleString('ko-KR')}`
  }
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
