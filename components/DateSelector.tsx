'use client'

import { motion } from 'framer-motion'
import type { StockChoice } from '@/lib/types'
import { useLocale } from '@/components/LocaleProvider'
import Button from '@vibe/design-system/components/ui/Button'

interface DateSelectorProps {
  stock: StockChoice
  onSelect: (date: string) => void
  onBack: () => void
}

interface SelectableDate {
  date: string
  label: string
  dayName: string
  tradingDay: number
}

function getSelectableDates(): SelectableDate[] {
  const results: SelectableDate[] = []
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
      tradingDay: results.length + 1,
    })
  }
  return results
}

function formatToday(locale: 'ko' | 'en') {
  return new Intl.DateTimeFormat(locale === 'ko' ? 'ko-KR' : 'en-US', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date())
}

export default function DateSelector({ stock, onSelect, onBack }: DateSelectorProps) {
  const { locale, tr } = useLocale()
  const dates = getSelectableDates()

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-mono text-accent mb-2">{tr('결과 확인일 선택', 'Choose result date')}</div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">{tr('얼마 동안 예측할까요?', 'How long should the prediction run?')}</h1>
        <p className="text-sm text-muted mt-2 leading-relaxed">
          {tr('장 마감 가격으로 승패를 판정합니다. 짧게는 하루, 길게는 약 2주 후까지 선택할 수 있어요.', 'Results use the market close. Choose from one trading day to about two weeks.')}
        </p>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3">
        <span className="text-xl">{stock?.market === 'KR' ? '🇰🇷' : '🇺🇸'}</span>
        <div className="min-w-0">
          <div className="text-white font-bold truncate">{stock?.name}</div>
          <div className="text-muted text-xs font-mono">{stock.symbol}</div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface-2 p-4">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted">{tr('배틀 시작일', 'Battle start')}</span>
          <strong className="text-white">{tr('오늘', 'Today')} · {formatToday(locale)}</strong>
        </div>
        <div className="h-px bg-border my-3" />
        <p className="text-muted text-xs leading-relaxed">
          {tr('다음 10거래일 중 선택하세요. 거래소 휴장일이면 그 다음 거래일 종가로 자동 판정합니다.', 'Choose from the next 10 trading days. If the exchange is closed, settlement moves to the next available close.')}
        </p>
        <p className="text-white/80 text-xs leading-relaxed mt-2">
          {stock.market === 'US'
            ? tr('미국 종목은 뉴욕 장 마감 후, 한국시간 다음 날 오전에 결과가 공개됩니다.', 'US-stock results appear after the New York close.')
            : tr('한국 종목은 선택일 장 마감 후 오후 3시 45분부터 결과를 확인할 수 있습니다.', 'Korean-stock results are available after the selected market close.')}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {dates.map((d, i) => (
          <motion.button
            key={d.date}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => onSelect(d.date)}
            className="group relative flex items-center sm:flex-col justify-between sm:justify-center min-h-[72px] py-3 px-3 rounded-xl border border-border bg-surface hover:border-accent hover:bg-accent/5 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            <div className="text-left sm:text-center">
              <span className="block text-[10px] font-black font-mono text-accent mb-1">D+{d.tradingDay}</span>
              <span className="block font-bold text-sm text-white">{d.label}</span>
            </div>
            <span className="text-xs font-mono text-muted group-hover:text-white transition-colors">
              {locale === 'ko' ? d.dayName : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(`${d.date}T12:00:00`).getDay()]}
            </span>
            {[1, 5, 10].includes(d.tradingDay) && (
              <span className="absolute top-2 right-2 hidden sm:block text-[9px] text-muted">
                {d.tradingDay === 1 ? tr('단기', '1 day') : d.tradingDay === 5 ? tr('1주', '1 week') : tr('2주', '2 weeks')}
              </span>
            )}
          </motion.button>
        ))}
      </div>

      <p className="text-xs text-muted leading-relaxed border-l-2 border-accent/60 pl-3">
        {tr('추천: 빠른 승부는 D+1~3, 추세를 보고 싶다면 D+5~10이 적합합니다.', 'Tip: choose D+1–3 for a quick battle or D+5–10 to test a broader trend.')}
      </p>

      <Button variant="ghost" size="sm" onClick={onBack}>
        ← {tr('종목 다시 선택', 'Choose a different stock')}
      </Button>
    </div>
  )
}
