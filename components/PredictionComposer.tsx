'use client'

import { AnimatePresence, motion } from 'framer-motion'
import type { StockAnalysis } from '@/lib/types'
import { formatPriceWithCurrency } from '@/lib/stocks'
import PercentSlider from '@/components/PercentSlider'
import Button from '@vibe/design-system/components/ui/Button'
import { useLocale } from '@/components/LocaleProvider'

interface PredictionComposerProps {
  analysis: StockAnalysis
  endDate: string
  toolName: string
  value: number
  onChange: (value: number) => void
  currency: 'KRW' | 'USD'
  onCurrencyChange: (currency: 'KRW' | 'USD') => void
  expanded: boolean
  onToggle: () => void
  alwaysExpanded?: boolean
  submitting: boolean
  submitError: string
  signedIn: boolean
  onBack: () => void
  onSubmit: () => void
}

export default function PredictionComposer({
  analysis,
  endDate,
  toolName,
  value,
  onChange,
  currency,
  onCurrencyChange,
  expanded,
  onToggle,
  alwaysExpanded = false,
  submitting,
  submitError,
  signedIn,
  onBack,
  onSubmit,
}: PredictionComposerProps) {
  const { tr } = useLocale()
  const isOpen = alwaysExpanded || expanded
  const predictedPrice = analysis.quote.price * (1 + value / 100)
  const directionClass = value > 0 ? 'text-up' : value < 0 ? 'text-down' : 'text-white'

  return (
    <section className="overflow-hidden rounded-2xl border-2 border-accent/50 bg-surface shadow-[0_0_32px_rgba(0,255,136,0.08)]">
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="text-xs font-mono font-bold text-accent mb-1">{tr('내 예측 입력', 'Enter my prediction')}</div>
            <p className="text-xs text-muted leading-relaxed">
              {tr(`${endDate} 장 마감 가격을 예측하세요.`, `Predict the closing price on ${endDate}.`)}
            </p>
          </div>
          {!alwaysExpanded && (
            <Button type="button" size="sm" variant="secondary" onClick={onToggle} aria-expanded={expanded}>
              {expanded ? tr('접기', 'Collapse') : tr('입력하기', 'Enter')} {expanded ? '−' : '+'}
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
          <div className={`text-5xl sm:text-6xl font-black font-mono tracking-tight ${directionClass}`}>
            {value > 0 ? '+' : ''}{value.toFixed(1)}%
          </div>
          <div className="pb-1">
            <div className="text-[11px] text-muted mb-0.5">{tr('예상 주가', 'Target price')}</div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-white">
              {formatPriceWithCurrency(
                predictedPrice,
                analysis.quote.market,
                currency,
                analysis.usdKrwRate
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-border">
          <div className="text-xs text-muted">
            {tr('현재가', 'Current')} <span className="text-white font-mono">{formatPriceWithCurrency(
              analysis.quote.price,
              analysis.quote.market,
              currency,
              analysis.usdKrwRate
            )}</span>
          </div>
          {analysis.quote.market === 'US' && (
            <div className="flex gap-1 rounded-lg border border-border bg-bg p-1" aria-label={tr('표시 통화', 'Display currency')}>
              <Button
                type="button"
                size="sm"
                variant={currency === 'KRW' ? 'primary' : 'ghost'}
                onClick={() => onCurrencyChange('KRW')}
                className="min-h-7 px-2 py-1 text-[10px]"
              >
                KRW
              </Button>
              <Button
                type="button"
                size="sm"
                variant={currency === 'USD' ? 'primary' : 'ghost'}
                onClick={() => onCurrencyChange('USD')}
                className="min-h-7 px-2 py-1 text-[10px]"
              >
                USD
              </Button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={alwaysExpanded ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border bg-surface-2/70 p-5 sm:p-6 space-y-5">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-white">{tr('등락률 조정', 'Adjust change')}</span>
                  <span className="text-xs text-muted">{tr('슬라이더 또는 직접 입력', 'Slider or direct input')}</span>
                </div>
                <PercentSlider value={value} onChange={onChange} />
              </div>

              <div className="rounded-xl border border-[#A78BFA]/35 bg-[#A78BFA]/[0.07] px-4 py-3">
                <div className="text-xs text-[#C4B5FD] leading-relaxed">
                  {tr(`${toolName}의 예측은 제출 후 공개됩니다. 먼저 내 판단을 확정해 주세요.`, `${toolName}'s prediction is revealed after submission. Lock in your own view first.`)}
                </div>
              </div>

              {submitError && <p className="text-xs text-down font-mono">{submitError}</p>}

              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={onBack}>
                  ← {tr('날짜 변경', 'Change date')}
                </Button>
                <Button type="button" onClick={onSubmit} disabled={submitting} className="flex-1">
                  {submitting ? tr('제출 중...', 'Submitting...') : tr('이 예측으로 배틀 시작', 'Start with this prediction')} →
                </Button>
              </div>

              {!signedIn && (
                <p className="text-[11px] text-muted text-center">
                  {tr('제출할 때 이메일로 로그인합니다.', 'You will sign in by email when submitting.')}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
