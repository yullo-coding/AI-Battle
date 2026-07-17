'use client'

import { motion } from 'framer-motion'
import { CURATED_STOCKS } from '@/lib/stocks'
import { useLocale } from '@/components/LocaleProvider'
import Button from '@vibe/design-system/components/ui/Button'

interface DateSelectorProps {
  symbol: string
  onSelect: (date: string) => void
  onBack: () => void
}

function getSelectableDates(): Array<{ date: string; label: string; dayName: string }> {
  const results: Array<{ date: string; label: string; dayName: string }> = []
  const today = new Date()
  const dayNames = ['일', '월', '화', '수', '목', '금', '토']

  // 오늘 이후 주말을 제외한 10일을 보여준다. 거래소 휴장일은 결과 확정 시
  // 다음 거래일 종가로 자동 보정한다.
  for (let i = 1; results.length < 10; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const isWeekend = d.getDay() === 0 || d.getDay() === 6
    if (isWeekend) continue
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const month = d.getMonth() + 1
    results.push({
      date: `${yyyy}-${mm}-${dd}`,
      label: `${month}/${d.getDate()}`,
      dayName: dayNames[d.getDay()],
    })
  }
  return results
}

export default function DateSelector({ symbol, onSelect, onBack }: DateSelectorProps) {
  const { locale, tr } = useLocale()
  const stock = CURATED_STOCKS.find(s => s.symbol === symbol)
  const dates = getSelectableDates()

  return (
    <div className="space-y-6">
      <div className="text-xs font-mono text-accent mb-2">{tr('결과 확인일 선택', 'Choose result date')}</div>
      <div className="flex items-center gap-2 mb-6">
        <span>{stock?.market === 'KR' ? '🇰🇷' : '🇺🇸'}</span>
        <span className="text-white font-bold">{stock?.name}</span>
        <span className="text-muted text-xs font-mono">{symbol}</span>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted">{tr('배틀 시작일', 'Battle start')}</span>
          <strong className="text-white">{tr('오늘', 'Today')}</strong>
        </div>
        <div className="h-px bg-border my-3" />
        <p className="text-muted text-xs leading-relaxed">
          {tr('주말을 제외한 다음 10거래일 중 결과를 확인할 날짜를 고르세요. 공휴일이면 다음 거래일 종가로 판정합니다.', 'Choose a result date from the next 10 weekdays. Market holidays settle at the next available close.')}
        </p>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {dates.map((d, i) => (
          <motion.button
            key={d.date}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => onSelect(d.date)}
            className="flex flex-col items-center py-3 px-1 rounded-xl border border-border bg-surface hover:border-accent hover:bg-accent/5 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            <span className="text-xs font-mono mb-1 text-muted">{locale === 'ko' ? d.dayName : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(`${d.date}T12:00:00`).getDay()]}</span>
            <span className="font-bold text-sm text-white">{d.label}</span>
          </motion.button>
        ))}
      </div>

      <Button variant="ghost" size="sm" onClick={onBack}>
        ← {tr('종목 다시 선택', 'Choose a different stock')}
      </Button>
    </div>
  )
}
