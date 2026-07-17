'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CURATED_STOCKS, formatPrice, formatChange } from '@/lib/stocks'

interface StockSelectorProps {
  onSelect: (symbol: string) => void
  onBack?: () => void
}

interface LiveQuote {
  price: number
  changePercent: number
}

export default function StockSelector({ onSelect, onBack }: StockSelectorProps) {
  const [quotes, setQuotes] = useState<Record<string, LiveQuote>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch('/api/stocks')
        if (!response.ok) throw new Error('시세 조회 실패')
        const results = await response.json() as Array<{ symbol: string; price: number; changePercent: number }>
        const map: Record<string, LiveQuote> = {}
        results.forEach(q => {
          map[q.symbol] = { price: q.price, changePercent: q.changePercent }
        })
        setQuotes(map)
      } catch { /* ignore */ }
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-mono text-accent mb-2">종목 선택</div>
        <h1 className="text-2xl font-black text-white">어떤 종목을 예측할까요?</h1>
        <p className="text-muted text-sm mt-2">한국과 미국의 인기 종목 10개 중 하나를 선택하세요.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              className="w-full bg-surface border border-border rounded-xl p-4 text-left hover:border-accent transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{stock.market === 'KR' ? '🇰🇷' : '🇺🇸'}</span>
                  <div>
                    <div className="font-bold text-white group-hover:text-accent transition-colors">
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
      {onBack && (
        <button onClick={onBack} className="text-muted text-sm font-mono hover:text-white transition-colors">
          ← AI 투자 서비스 다시 선택
        </button>
      )}
    </div>
  )
}
