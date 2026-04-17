'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CURATED_STOCKS, formatPrice, formatChange } from '@/lib/stocks'

interface StockSelectorProps {
  onSelect: (symbol: string) => void
}

interface LiveQuote {
  price: number
  changePercent: number
}

export default function StockSelector({ onSelect }: StockSelectorProps) {
  const [quotes, setQuotes] = useState<Record<string, LiveQuote>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const results = await Promise.allSettled(
          CURATED_STOCKS.map(s =>
            fetch(`/api/stocks/${s.symbol}`).then(r => r.json())
          )
        )
        const map: Record<string, LiveQuote> = {}
        results.forEach((r, i) => {
          if (r.status === 'fulfilled' && r.value?.quote) {
            map[CURATED_STOCKS[i].symbol] = {
              price: r.value.quote.price,
              changePercent: r.value.quote.changePercent,
            }
          }
        })
        setQuotes(map)
      } catch { /* ignore */ }
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="space-y-4">
      <div className="tag text-accent mb-6">// STEP_1 — 종목 선택</div>
      <p className="text-muted text-sm mb-6">AI와 배틀할 종목을 선택하세요.</p>
      <div className="grid grid-cols-1 gap-4">
        {CURATED_STOCKS.map((stock, i) => {
          const q = quotes[stock.symbol]
          const isUp = (q?.changePercent ?? 0) >= 0
          return (
            <motion.button
              key={stock.symbol}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => onSelect(stock.symbol)}
              className="w-full bg-surface border border-border rounded-xl p-5 text-left hover:border-accent transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{stock.market === 'KR' ? '🇰🇷' : '🇺🇸'}</span>
                  <div>
                    <div className="font-bold text-white text-lg group-hover:text-accent transition-colors">
                      {stock.name}
                    </div>
                    <div className="text-muted text-xs font-mono">{stock.symbol}</div>
                  </div>
                </div>
                <div className="text-right">
                  {loading ? (
                    <div className="h-6 w-24 bg-border rounded animate-pulse" />
                  ) : q ? (
                    <>
                      <div className="text-white font-bold font-mono">
                        {formatPrice(q.price, stock.market)}
                      </div>
                      <div className={`text-sm font-mono font-bold ${isUp ? 'text-up' : 'text-down'}`}>
                        {isUp ? '▲' : '▼'} {formatChange(q.changePercent)}
                      </div>
                    </>
                  ) : (
                    <div className="text-muted text-xs">데이터 없음</div>
                  )}
                </div>
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
