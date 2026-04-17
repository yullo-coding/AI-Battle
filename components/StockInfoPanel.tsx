'use client'

import { motion } from 'framer-motion'
import type { StockAnalysis } from '@/lib/types'
import { formatPrice } from '@/lib/stocks'
import { bollingerPosition, rsiLabel, macdSignal } from '@/lib/indicators'

interface StockInfoPanelProps {
  analysis: StockAnalysis
  endDate: string
  onNext: () => void
  onBack: () => void
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <div className="tag text-muted mb-4">{title}</div>
      {children}
    </div>
  )
}

function Row({ label, value, valueClass }: { label: string; value: React.ReactNode; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-muted text-sm">{label}</span>
      <span className={`font-mono text-sm font-bold ${valueClass ?? 'text-white'}`}>{value}</span>
    </div>
  )
}

export default function StockInfoPanel({ analysis, endDate, onNext, onBack }: StockInfoPanelProps) {
  const { quote, rsi14, macd, bollinger, ma20, ma50,
    analystTargetPrice, analystRecommendation, analystCount,
    analystBuyCount, analystHoldCount, analystSellCount,
    fearGreedValue, fearGreedLabel, recentNews } = analysis

  const mkt = quote.market
  const pricePos = quote.high52 > 0
    ? Math.round(((quote.price - quote.low52) / (quote.high52 - quote.low52)) * 100)
    : 50
  const bolPos = bollingerPosition(quote.price, bollinger)
  const rsiLbl = rsiLabel(rsi14)
  const macdLbl = macdSignal(macd.histogram)
  const isUp = quote.changePercent >= 0

  const analystTotal = (analystBuyCount ?? 0) + (analystHoldCount ?? 0) + (analystSellCount ?? 0)
  const buyPct = analystTotal > 0 ? Math.round(((analystBuyCount ?? 0) / analystTotal) * 100) : 0
  const holdPct = analystTotal > 0 ? Math.round(((analystHoldCount ?? 0) / analystTotal) * 100) : 0
  const sellPct = 100 - buyPct - holdPct

  const fearColor = fearGreedValue != null
    ? fearGreedValue >= 60 ? 'text-up' : fearGreedValue <= 30 ? 'text-down' : 'text-accent'
    : 'text-muted'

  return (
    <div className="space-y-4">
      <div className="tag text-accent">// STEP_3 — 종합 지표</div>

      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span>{mkt === 'KR' ? '🇰🇷' : '🇺🇸'}</span>
            <span className="text-muted text-xs font-mono">{quote.symbol}</span>
          </div>
          <h2 className="text-2xl font-black text-white">{quote.name}</h2>
          <div className="flex items-baseline gap-3 mt-1">
            <span className="text-2xl font-bold font-mono text-white">
              {formatPrice(quote.price, mkt)}
            </span>
            <span className={`font-mono font-bold ${isUp ? 'text-up' : 'text-down'}`}>
              {isUp ? '▲' : '▼'} {Math.abs(quote.changePercent).toFixed(2)}%
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted font-mono">결과 날짜</div>
          <div className="text-accent font-bold font-mono">{endDate}</div>
        </div>
      </div>

      {/* 섹션 1 — 시세 */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Section title="// 시세 데이터">
          <Row label="시가 / 고가 / 저가"
            value={`${formatPrice(quote.open, mkt)} / ${formatPrice(quote.high, mkt)} / ${formatPrice(quote.low, mkt)}`} />
          <Row label="52주 고가" value={formatPrice(quote.high52, mkt)} />
          <Row label="52주 저가" value={formatPrice(quote.low52, mkt)} />
          <div className="mt-3">
            <div className="flex justify-between text-xs text-muted font-mono mb-1">
              <span>52주 저가</span>
              <span className="text-accent">{pricePos}% 위치</span>
              <span>52주 고가</span>
            </div>
            <div className="h-2 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all"
                style={{ width: `${pricePos}%` }}
              />
            </div>
          </div>
          <Row label="거래량" value={`${(quote.volume / 1_000_000).toFixed(1)}M`} />
          {quote.avgVolume > 0 && (
            <Row
              label="평균 거래량 대비"
              value={`${((quote.volume / quote.avgVolume) * 100).toFixed(0)}%`}
              valueClass={quote.volume > quote.avgVolume ? 'text-up' : 'text-muted'}
            />
          )}
        </Section>
      </motion.div>

      {/* 섹션 2 — 기술적 지표 */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Section title="// 기술적 지표">
          {/* RSI 게이지 */}
          <div className="mb-4">
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-muted">RSI(14)</span>
              <span className={`font-bold ${rsi14 >= 70 ? 'text-down' : rsi14 <= 30 ? 'text-up' : 'text-accent'}`}>
                {rsi14} — {rsiLbl}
              </span>
            </div>
            <div className="relative h-2 bg-border rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  rsi14 >= 70 ? 'bg-down' : rsi14 <= 30 ? 'bg-up' : 'bg-accent'
                }`}
                style={{ width: `${rsi14}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted mt-0.5">
              <span>0 과매도</span><span>50</span><span>100 과매수</span>
            </div>
          </div>

          <Row
            label="MACD 히스토그램"
            value={`${macd.histogram > 0 ? '+' : ''}${macd.histogram.toFixed(3)} — ${macdLbl}`}
            valueClass={macd.histogram > 0 ? 'text-up' : 'text-down'}
          />
          <Row label="볼린저 밴드 위치" value={bolPos} />
          <Row
            label="MA20"
            value={`${formatPrice(ma20, mkt)} (${quote.price > ma20 ? '↑ 위' : '↓ 아래'})`}
            valueClass={quote.price > ma20 ? 'text-up' : 'text-down'}
          />
          <Row
            label="MA50"
            value={`${formatPrice(ma50, mkt)} (${quote.price > ma50 ? '↑ 위' : '↓ 아래'})`}
            valueClass={quote.price > ma50 ? 'text-up' : 'text-down'}
          />
        </Section>
      </motion.div>

      {/* 섹션 3 — 전문가 분석 */}
      {(analystTargetPrice || analystTotal > 0) && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Section title="// 전문가 분석">
            {analystTargetPrice && (
              <>
                <Row
                  label="목표가"
                  value={formatPrice(analystTargetPrice, mkt)}
                />
                <Row
                  label="현재 대비 상승여력"
                  value={`${(((analystTargetPrice - quote.price) / quote.price) * 100).toFixed(1)}%`}
                  valueClass={analystTargetPrice > quote.price ? 'text-up' : 'text-down'}
                />
              </>
            )}
            {analystRecommendation && (
              <Row label="애널리스트 추천" value={analystRecommendation.toUpperCase()} />
            )}
            {analystTotal > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-up">매수 {buyPct}%</span>
                  <span className="text-muted">중립 {holdPct}%</span>
                  <span className="text-down">매도 {sellPct}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden flex">
                  <div className="bg-up" style={{ width: `${buyPct}%` }} />
                  <div className="bg-border" style={{ width: `${holdPct}%` }} />
                  <div className="bg-down" style={{ width: `${sellPct}%` }} />
                </div>
                <div className="text-xs text-muted mt-1">{analystCount ?? analystTotal}명 의견</div>
              </div>
            )}
          </Section>
        </motion.div>
      )}

      {/* 섹션 4 — 시장 심리 */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Section title="// 시장 심리">
          {fearGreedValue != null && (
            <div className="flex items-center justify-between mb-4 p-3 bg-surface-2 rounded-lg border border-border">
              <div>
                <div className="text-xs text-muted mb-0.5">공포탐욕지수</div>
                <div className={`text-lg font-black font-mono ${fearColor}`}>
                  {fearGreedValue} — {fearGreedLabel}
                </div>
              </div>
              <div className="relative w-16 h-16">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1E1E1E" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none"
                    stroke={fearGreedValue >= 60 ? '#00FF88' : fearGreedValue <= 30 ? '#FF4444' : '#00FF88'}
                    strokeWidth="3"
                    strokeDasharray={`${fearGreedValue} 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-xs font-bold ${fearColor}`}>{fearGreedValue}</span>
                </div>
              </div>
            </div>
          )}
          {recentNews.length > 0 ? (
            <div className="space-y-2">
              <div className="text-xs text-muted font-mono mb-2">// 최근 주요 뉴스</div>
              {recentNews.map((n, i) => (
                <div key={i} className="text-sm text-white/80 border-l-2 border-border pl-3 py-1">
                  <div>{n.headline}</div>
                  {n.date && <div className="text-xs text-muted mt-0.5">{n.date}</div>}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted text-sm">최근 뉴스 없음</div>
          )}
        </Section>
      </motion.div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          className="px-4 py-3 border border-border text-muted rounded-lg text-sm font-mono hover:border-white hover:text-white transition-colors"
        >
          ← 날짜 다시 선택
        </button>
        <button
          onClick={onNext}
          className="flex-1 py-3 bg-accent text-bg font-bold rounded-lg hover:bg-accent-dim transition-colors"
        >
          내 예측 입력하기 →
        </button>
      </div>
    </div>
  )
}
