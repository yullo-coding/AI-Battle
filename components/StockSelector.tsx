'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CURATED_STOCKS, formatPrice, formatChange } from '@/lib/stocks'
import type { StockChoice } from '@/lib/types'
import { useLocale } from '@/components/LocaleProvider'
import Button from '@vibe/design-system/components/ui/Button'
import Input from '@vibe/design-system/components/ui/Input'

interface StockSelectorProps {
  onSelect: (stock: StockChoice) => void
  onBack?: () => void
}

interface LiveQuote {
  price: number
  changePercent: number
}

export default function StockSelector({ onSelect, onBack }: StockSelectorProps) {
  const { tr } = useLocale()
  const [quotes, setQuotes] = useState<Record<string, LiveQuote>>({})
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<StockChoice[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch('/api/stocks')
        if (!response.ok) throw new Error('quote failed')
        const list = await response.json() as Array<{ symbol: string; price: number; changePercent: number }>
        const map: Record<string, LiveQuote> = {}
        list.forEach(quote => { map[quote.symbol] = { price: quote.price, changePercent: quote.changePercent } })
        setQuotes(map)
      } catch { /* popular cards can still be selected */ }
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    const keyword = query.trim()
    if (keyword.length < 2) {
      setResults([])
      setSearching(false)
      setSearchError(false)
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setSearching(true)
      setSearchError(false)
      try {
        const response = await fetch(`/api/stocks/search?q=${encodeURIComponent(keyword)}`, { signal: controller.signal })
        if (!response.ok) throw new Error('search failed')
        setResults(await response.json() as StockChoice[])
      } catch {
        if (!controller.signal.aborted) {
          setResults([])
          setSearchError(true)
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false)
      }
    }, 350)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  const isSearching = query.trim().length >= 2

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs font-mono text-accent mb-2">{tr('종목 선택', 'Choose a stock')}</div>
        <h1 className="text-2xl font-black text-white">{tr('어떤 종목을 예측할까요?', 'Which stock will you predict?')}</h1>
        <p className="text-muted text-sm mt-2">{tr('인기 종목을 고르거나 한국 종목코드·미국 회사명과 티커를 검색하세요.', 'Choose a popular stock, or search Korean codes and US company names or tickers.')}</p>
      </div>

      <div className="relative">
        <Input
          value={query}
          onChange={event => setQuery(event.target.value)}
          label={tr('종목 검색', 'Search stocks')}
          placeholder={tr('예: Apple, AAPL, 삼성전자, 005930', 'e.g. Apple, AAPL, Samsung, 005930')}
          autoComplete="off"
          className="pr-12"
        />
        {query && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="absolute right-1.5 bottom-1.5 min-w-9 px-2"
            onClick={() => setQuery('')}
            aria-label={tr('검색어 지우기', 'Clear search')}
          >
            ×
          </Button>
        )}
      </div>

      {isSearching ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white">{tr('검색 결과', 'Search results')}</h2>
            {!searching && <span className="text-xs text-muted">{results.length}{tr('개', ' results')}</span>}
          </div>
          {searching ? (
            <div className="flex items-center justify-center gap-3 min-h-32 rounded-xl border border-border bg-surface text-muted text-sm">
              <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
              {tr('종목 찾는 중...', 'Searching listings...')}
            </div>
          ) : searchError ? (
            <div className="min-h-28 flex items-center justify-center rounded-xl border border-danger/40 text-danger text-sm">
              {tr('검색하지 못했습니다. 잠시 후 다시 시도해주세요.', 'Search failed. Please try again shortly.')}
            </div>
          ) : results.length ? (
            <div className="grid gap-2">
              {results.map((stock, index) => (
                <motion.button
                  key={stock.symbol}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  type="button"
                  onClick={() => onSelect(stock)}
                  className="w-full flex items-center justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-3 text-left hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl">{stock.market === 'KR' ? '🇰🇷' : '🇺🇸'}</span>
                    <div className="min-w-0">
                      <div className="font-bold text-white truncate group-hover:text-accent transition-colors">{stock.name}</div>
                      <div className="text-xs text-muted font-mono truncate">{stock.symbol} · {stock.exchange || (stock.market === 'KR' ? 'Korea' : 'US')}</div>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full border border-border px-2 py-1 text-[10px] text-muted font-mono">
                    {stock.quoteType === 'ETF' ? 'ETF' : tr('주식', 'Stock')}
                  </span>
                </motion.button>
              ))}
            </div>
          ) : (
            <div className="min-h-28 flex flex-col items-center justify-center rounded-xl border border-border text-muted text-sm text-center px-5">
              <strong className="text-white mb-1">{tr('검색 결과가 없습니다.', 'No matching stocks.')}</strong>
              <span className="text-xs">{tr('한국 종목은 종목명 또는 6자리 코드, 미국 종목은 영문명 또는 티커로 검색해보세요.', 'Try a Korean 6-digit code or an English company name or ticker.')}</span>
            </div>
          )}
        </div>
      ) : (
        <div>
          <h2 className="text-sm font-bold text-white mb-3">{tr('인기 종목', 'Popular stocks')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CURATED_STOCKS.map((stock, index) => {
              const quote = quotes[stock.symbol]
              const isUp = (quote?.changePercent ?? 0) >= 0
              return (
                <motion.button
                  key={stock.symbol}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => onSelect({ ...stock, quoteType: 'EQUITY' })}
                  className="w-full bg-surface border border-border rounded-xl p-4 text-left hover:border-accent transition-all duration-200 cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{stock.market === 'KR' ? '🇰🇷' : '🇺🇸'}</span>
                      <div>
                        <div className="font-bold text-white group-hover:text-accent transition-colors">{stock.name}</div>
                        <div className="text-muted text-xs font-mono">{stock.symbol}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      {loading ? (
                        <div className="h-6 w-24 bg-border rounded animate-pulse" />
                      ) : quote ? (
                        <>
                          <div className="text-white font-bold font-mono">{formatPrice(quote.price, stock.market)}</div>
                          <div className={`text-sm font-mono font-bold ${isUp ? 'text-up' : 'text-down'}`}>
                            {isUp ? '▲' : '▼'} {formatChange(quote.changePercent)}
                          </div>
                        </>
                      ) : <div className="text-muted text-xs">{tr('선택 가능', 'Available')}</div>}
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </div>
        </div>
      )}

      {onBack && (
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← {tr('AI 투자 서비스 다시 선택', 'Choose a different AI service')}
        </Button>
      )}
    </div>
  )
}
