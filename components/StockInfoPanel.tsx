'use client'

import { motion } from 'framer-motion'
import type { StockAnalysis } from '@/lib/types'
import { formatPrice } from '@/lib/stocks'
import { bollingerPosition, rsiLabel, macdSignal } from '@/lib/indicators'

interface StockInfoPanelProps {
  analysis: StockAnalysis
  endDate: string
}

type SignalType = 'buy' | 'sell' | 'neutral'

const SIGNAL_LABEL: Record<SignalType, string> = { buy: '매수', sell: '매도', neutral: '중립' }
const SIGNAL_COLOR: Record<SignalType, string> = {
  buy: 'text-up bg-up/15 border-up/40',
  sell: 'text-down bg-down/15 border-down/40',
  neutral: 'text-accent bg-accent/10 border-accent/30',
}

function SignalBadge({ signal }: { signal: SignalType }) {
  return (
    <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full border ${SIGNAL_COLOR[signal]}`}>
      {SIGNAL_LABEL[signal]}
    </span>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-sm font-bold text-white/60 mb-3">{children}</div>
}

export default function StockInfoPanel({ analysis, endDate }: StockInfoPanelProps) {
  const { quote, rsi14, macd, bollinger, ma20, ma50,
    analystTargetPrice, analystCount,
    analystBuyCount, analystHoldCount, analystSellCount,
    fearGreedValue, fearGreedLabel, recentNews } = analysis

  const mkt = quote.market
  const isUp = quote.changePercent >= 0

  const pricePos = quote.high52 > 0
    ? Math.round(((quote.price - quote.low52) / (quote.high52 - quote.low52)) * 100)
    : 50

  const bolPos = bollingerPosition(quote.price, bollinger)
  const bolSignal: SignalType = bolPos.includes('하단') ? 'buy' : bolPos.includes('상단') ? 'sell' : 'neutral'
  const rsiSignal: SignalType = rsi14 <= 30 ? 'buy' : rsi14 >= 70 ? 'sell' : 'neutral'
  const macdSignalType: SignalType = macd.histogram > 0 ? 'buy' : 'sell'
  const maAbove = (quote.price > ma20 ? 1 : 0) + (quote.price > ma50 ? 1 : 0)
  const maSignal: SignalType = maAbove === 2 ? 'buy' : maAbove === 0 ? 'sell' : 'neutral'

  // 종합 신호 집계
  const signals: SignalType[] = [rsiSignal, macdSignalType, bolSignal, maSignal]
  const buyCount = signals.filter(s => s === 'buy').length
  const sellCount = signals.filter(s => s === 'sell').length
  const overallSignal: SignalType = buyCount > sellCount ? 'buy' : sellCount > buyCount ? 'sell' : 'neutral'
  const overallLabel = overallSignal === 'buy' ? '📈 상승 우세' : overallSignal === 'sell' ? '📉 하락 우세' : '↔️ 혼조세'
  const overallDesc = overallSignal === 'buy'
    ? `${buyCount}개 지표 상승 신호`
    : overallSignal === 'sell'
    ? `${sellCount}개 지표 하락 신호`
    : '상승·하락 신호 혼재'

  const analystTotal = (analystBuyCount ?? 0) + (analystHoldCount ?? 0) + (analystSellCount ?? 0)
  const buyPct = analystTotal > 0 ? Math.round(((analystBuyCount ?? 0) / analystTotal) * 100) : 0
  const holdPct = analystTotal > 0 ? Math.round(((analystHoldCount ?? 0) / analystTotal) * 100) : 0
  const sellPct = 100 - buyPct - holdPct

  const upside = analystTargetPrice
    ? (((analystTargetPrice - quote.price) / quote.price) * 100).toFixed(1)
    : null

  const fearColor = fearGreedValue != null
    ? fearGreedValue >= 60 ? '#00FF88' : fearGreedValue <= 30 ? '#FF4444' : '#FFD700'
    : '#888'

  return (
    <div className="space-y-4">

      {/* ── 종목 헤더 ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="bg-surface border border-border rounded-2xl p-5">
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{mkt === 'KR' ? '🇰🇷' : '🇺🇸'}</span>
                <span className="text-muted text-xs font-mono">{quote.symbol}</span>
              </div>
              <h2 className="text-xl font-black text-white">{quote.name}</h2>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted mb-0.5">결과 확인일</div>
              <div className="text-accent font-bold font-mono">{endDate}</div>
            </div>
          </div>

          {/* 현재가 */}
          <div className="flex items-baseline gap-3 mb-5">
            <span className="text-4xl font-black font-mono text-white">
              {formatPrice(quote.price, mkt)}
            </span>
            <span className={`text-xl font-bold font-mono ${isUp ? 'text-up' : 'text-down'}`}>
              {isUp ? '▲' : '▼'} {Math.abs(quote.changePercent).toFixed(2)}%
            </span>
          </div>

          {/* 52주 레인지 */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-muted mb-2">
              <span>52주 최저<br /><span className="text-white font-mono">{formatPrice(quote.low52, mkt)}</span></span>
              <span className="text-center">현재 위치<br /><span className="text-accent font-bold font-mono">{pricePos}%</span></span>
              <span className="text-right">52주 최고<br /><span className="text-white font-mono">{formatPrice(quote.high52, mkt)}</span></span>
            </div>
            <div className="h-3 bg-border rounded-full overflow-hidden relative">
              <div className="h-full bg-gradient-to-r from-down via-accent to-up rounded-full opacity-25" style={{ width: '100%' }} />
              <div
                className="absolute top-0 h-full w-1.5 bg-white rounded-full shadow-lg"
                style={{ left: `${pricePos}%`, transform: 'translateX(-50%)' }}
              />
            </div>
          </div>

          {/* 거래량 */}
          {quote.avgVolume > 0 && (
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
              quote.volume > quote.avgVolume * 1.2
                ? 'bg-up/10 text-up border border-up/30'
                : 'bg-border/50 text-muted border border-border'
            }`}>
              {quote.volume > quote.avgVolume * 1.2 ? '🔥' : '📊'} 거래량 평균 대비 {((quote.volume / quote.avgVolume) * 100).toFixed(0)}%
            </div>
          )}
        </div>
      </motion.div>

      {/* ── 종합 신호 요약 ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
        <div className={`rounded-2xl border p-4 ${
          overallSignal === 'buy' ? 'bg-up/8 border-up/30' : overallSignal === 'sell' ? 'bg-down/8 border-down/30' : 'bg-accent/8 border-accent/25'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted mb-1">기술적 지표 종합</div>
              <div className={`text-2xl font-black ${overallSignal === 'buy' ? 'text-up' : overallSignal === 'sell' ? 'text-down' : 'text-accent'}`}>
                {overallLabel}
              </div>
              <div className="text-xs text-muted mt-0.5">{overallDesc}</div>
            </div>
            <div className="flex gap-1.5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className={`w-3 h-8 rounded-full ${
                  i < buyCount ? 'bg-up' : i < buyCount + (4 - buyCount - sellCount) ? 'bg-accent/40' : 'bg-down'
                }`} />
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── 기술적 지표 ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="bg-surface border border-border rounded-2xl p-5">
          <SectionTitle>📊 기술적 지표</SectionTitle>
          <div className="space-y-4">

            {/* RSI 게이지 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-bold text-white">RSI</span>
                  <span className="text-xs text-muted ml-2">14일 기준</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-black font-mono ${rsiSignal === 'buy' ? 'text-up' : rsiSignal === 'sell' ? 'text-down' : 'text-white'}`}>
                    {rsi14}
                  </span>
                  <SignalBadge signal={rsiSignal} />
                </div>
              </div>
              <div className="relative h-4 bg-border rounded-full overflow-hidden">
                <div className="absolute inset-0 flex">
                  <div className="bg-up/30 rounded-l-full" style={{ width: '30%' }} />
                  <div className="bg-accent/20" style={{ width: '40%' }} />
                  <div className="bg-down/30 rounded-r-full" style={{ width: '30%' }} />
                </div>
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg border-2 border-bg"
                  style={{ left: `calc(${Math.min(98, Math.max(2, rsi14))}% - 6px)` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted mt-1 px-0.5">
                <span className="text-up">과매도 (30↓)</span>
                <span>중립</span>
                <span className="text-down">과매수 (70↑)</span>
              </div>
            </div>

            <div className="h-px bg-border/50" />

            {/* MACD */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-white">MACD</div>
                <div className="text-xs text-muted mt-0.5">
                  {macd.histogram > 0 ? '상승 모멘텀 우세' : '하락 모멘텀 우세'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-mono font-bold ${macdSignalType === 'buy' ? 'text-up' : 'text-down'}`}>
                  {macd.histogram > 0 ? '+' : ''}{macd.histogram.toFixed(3)}
                </span>
                <SignalBadge signal={macdSignalType} />
              </div>
            </div>

            <div className="h-px bg-border/50" />

            {/* 볼린저 밴드 */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-white">볼린저 밴드</div>
                <div className="text-xs text-muted mt-0.5">{bolPos}</div>
              </div>
              <SignalBadge signal={bolSignal} />
            </div>

            <div className="h-px bg-border/50" />

            {/* 이동평균 */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-white">이동평균</div>
                <div className="flex gap-3 text-xs text-muted mt-0.5">
                  <span>MA20 <span className={`font-mono font-bold ${quote.price > ma20 ? 'text-up' : 'text-down'}`}>{quote.price > ma20 ? '↑ 위' : '↓ 아래'}</span></span>
                  <span>MA50 <span className={`font-mono font-bold ${quote.price > ma50 ? 'text-up' : 'text-down'}`}>{quote.price > ma50 ? '↑ 위' : '↓ 아래'}</span></span>
                </div>
              </div>
              <SignalBadge signal={maSignal} />
            </div>

          </div>
        </div>
      </motion.div>

      {/* ── 전문가 분석 ── */}
      {(analystTargetPrice || analystTotal > 0) && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
          <div className="bg-surface border border-border rounded-2xl p-5">
            <SectionTitle>🎯 전문가 분석</SectionTitle>

            {analystTargetPrice && upside && (
              <div className={`rounded-xl p-4 mb-4 ${Number(upside) > 0 ? 'bg-up/8 border border-up/25' : 'bg-down/8 border border-down/25'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted mb-1">애널리스트 평균 목표가</div>
                    <div className="text-2xl font-black font-mono text-white">{formatPrice(analystTargetPrice, mkt)}</div>
                    <div className="text-xs text-muted mt-1">현재가 {formatPrice(quote.price, mkt)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted mb-1">상승여력</div>
                    <div className={`text-4xl font-black font-mono ${Number(upside) > 0 ? 'text-up' : 'text-down'}`}>
                      {Number(upside) > 0 ? '+' : ''}{upside}%
                    </div>
                  </div>
                </div>
              </div>
            )}

            {analystTotal > 0 && (
              <div>
                <div className="h-4 rounded-full overflow-hidden flex mb-2">
                  <div className="bg-up" style={{ width: `${buyPct}%` }} />
                  <div className="bg-accent/40" style={{ width: `${holdPct}%` }} />
                  <div className="bg-down" style={{ width: `${sellPct}%` }} />
                </div>
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-up font-bold">매수 {buyPct}%</span>
                  <span className="text-muted">{analystCount ?? analystTotal}명 · 중립 {holdPct}%</span>
                  <span className="text-down font-bold">매도 {sellPct}%</span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── 시장 심리 ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
        <div className="bg-surface border border-border rounded-2xl p-5">
          <SectionTitle>🧠 시장 심리</SectionTitle>

          {fearGreedValue != null && (
            <div className="flex items-center gap-5 mb-5 pb-5 border-b border-border/50">
              {/* 게이지 */}
              <div className="relative w-20 h-20 flex-shrink-0">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1E1E1E" strokeWidth="3.5" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none"
                    stroke={fearColor}
                    strokeWidth="3.5"
                    strokeDasharray={`${fearGreedValue} 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-black" style={{ color: fearColor }}>{fearGreedValue}</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted mb-1">공포·탐욕 지수</div>
                <div className="text-2xl font-black" style={{ color: fearColor }}>{fearGreedLabel}</div>
                <div className="text-xs text-muted mt-1 leading-relaxed">
                  {fearGreedValue >= 70 ? '시장 과열 — 조심할 타이밍'
                    : fearGreedValue >= 55 ? '낙관적 분위기'
                    : fearGreedValue >= 45 ? '중립적 분위기'
                    : fearGreedValue >= 30 ? '불안한 분위기'
                    : '극도의 공포 — 저점 매수 기회 가능성'}
                </div>
              </div>
            </div>
          )}

          {recentNews.length > 0 ? (
            <div className="space-y-3">
              <div className="text-xs text-muted font-bold">최근 주요 뉴스</div>
              {recentNews.map((n, i) => (
                <div key={i} className="flex gap-3 p-3 bg-surface-2 rounded-xl">
                  <div className="text-muted text-xs font-mono mt-0.5 flex-shrink-0">0{i + 1}</div>
                  <div>
                    <div className="text-sm text-white/90 leading-snug">{n.headline}</div>
                    {n.date && <div className="text-xs text-muted mt-1">{n.date}</div>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted text-sm text-center py-4">최근 뉴스 없음</div>
          )}
        </div>
      </motion.div>

    </div>
  )
}
