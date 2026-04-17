'use client'

import { motion } from 'framer-motion'
import { CURATED_STOCKS } from '@/lib/stocks'

interface DateSelectorProps {
  symbol: string
  onSelect: (date: string) => void
  onBack: () => void
}

function getSelectableDates(): Array<{ date: string; label: string; dayName: string; isWeekend: boolean }> {
  const results = []
  const today = new Date()
  const dayNames = ['일', '월', '화', '수', '목', '금', '토']

  for (let i = 1; i <= 7; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const isWeekend = d.getDay() === 0 || d.getDay() === 6
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const month = d.getMonth() + 1
    results.push({
      date: `${yyyy}-${mm}-${dd}`,
      label: `${month}/${d.getDate()}`,
      dayName: dayNames[d.getDay()],
      isWeekend,
    })
  }
  return results
}

export default function DateSelector({ symbol, onSelect, onBack }: DateSelectorProps) {
  const stock = CURATED_STOCKS.find(s => s.symbol === symbol)
  const dates = getSelectableDates()

  return (
    <div className="space-y-6">
      <div className="tag text-accent mb-2">// STEP_2 — 날짜 선택</div>
      <div className="flex items-center gap-2 mb-6">
        <span>{stock?.market === 'KR' ? '🇰🇷' : '🇺🇸'}</span>
        <span className="text-white font-bold">{stock?.name}</span>
        <span className="text-muted text-xs font-mono">{symbol}</span>
      </div>

      <p className="text-muted text-sm">결과를 확인할 날짜를 선택하세요. (주말은 다음 영업일 기준)</p>

      <div className="grid grid-cols-7 gap-2">
        {dates.map((d, i) => (
          <motion.button
            key={d.date}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => !d.isWeekend && onSelect(d.date)}
            disabled={d.isWeekend}
            className={`flex flex-col items-center py-3 px-1 rounded-xl border transition-all duration-200 ${
              d.isWeekend
                ? 'border-border bg-surface opacity-30 cursor-not-allowed'
                : 'border-border bg-surface hover:border-accent hover:bg-accent/5 cursor-pointer'
            }`}
          >
            <span className={`text-xs font-mono mb-1 ${d.isWeekend ? 'text-muted' : 'text-muted'}`}>
              {d.dayName}
            </span>
            <span className={`font-bold text-sm ${d.isWeekend ? 'text-muted' : 'text-white'}`}>
              {d.label}
            </span>
          </motion.button>
        ))}
      </div>

      <button
        onClick={onBack}
        className="text-muted text-sm font-mono hover:text-white transition-colors"
      >
        ← 종목 다시 선택
      </button>
    </div>
  )
}
