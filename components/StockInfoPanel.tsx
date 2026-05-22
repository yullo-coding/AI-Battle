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

function SignalCard({ label, value, signal, desc }: {
  label: string
  value: string
  signal: SignalType
  desc: string
}) {
  const colors: Record<SignalType, { border: string; text: string; bg: string; dot: string }> = {
    buy:     { border: 'border-up/40',     text: 'text-up',     bg: 'bg-up/5',     dot: 'bg-up' },
    sell:    { border: 'border-down/40',   text: 'text-down',   bg: 'bg-down/5',   dot: 'bg-down' },
    neutral: { border: 'border-accent/30', text: 'text-accent', bg: 'bg-accent/5', dot: 'bg-accent' },
  }
  const c = colors[signal]
  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-4`}>
      <div className="flex items-center gap-1.5 mb-2">
        <div className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
        <span className="text-xs font-mono text-muted">{label}</span>
      </div>
      <div className={`text-lg font-black font-mono ${c.text} mb-1`}>{value}</div>
      <div className="text-xs text-muted leading-relaxed">{desc}</div>
    </div>
  )
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
  const rsiDesc = rsi14 <= 30
    ? '과매도 구간. 반등 가능성 있음'
    : rsi14 >= 70
    ? '과매수 구간. 조정 가능성 있음'
    : '중립 구간'

  const macdSignalType: SignalType = macd.histogram > 0 ? 'buy' : 'sell'
  const macdDesc = macd.histogram > 0
    ? '상승 모멘텀. 매수 압력 우세'
    : '하락 모멘텀. 매도 압력 우세'

  const maAbove = (quote.price > ma20 ? 1 : 0) + (quote.price > ma50 ? 1 : 0)
  const maSignal: SignalType = maAbove === 2 ? 'buy' : maAbove === 0 ? 'sell' : 'neutral'
  const maDesc = maAbove === 2
    ? 'MA20·MA50 모두 위. 강세 흐름'
    : maAbove === 0
    ? 'MA20·MA50 모두 아래. 약세 흐름'
    : '단기·장기 이평선 사이. 방향 불분명'

  const analystTotal = (analystBuyCount ?? 0) + (analystHoldCount ?? 0) + (analystSellCount ?? 0)
  const buyPct = analystTotal > 0 ? Math.round(((analystBuyCount ?? 0) / analystTotal) * 100) : 0
  const holdPct = analystTotal > 0 ? Math.round(((analystHoldCount ?? 0) / analystTotal) * 100) : 0
  const sellPct = 100 - buyPct - holdPct

  const upside = analystTargetPrice
    ? (((analystTargetPrice - quote.price) / quote.price) * 100).toFixed(1)
    : null

  const fearColor = fearGreedValue != null
    ? fearGreedValue >= 60 ? 'text-up' : fearGreedValue <= 30 ? 'text-down' : 'text-accent'
    : 'text-muted'

  return (
    <div className="space-y-5">
      <div className="tag text-accent">// STEP_3 — 종합 지표</div>

      {/* 종목 헤더 */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span>{mkt === 'KR' ? '🇰🇷' : '🇺🇸'}</span>
                <span className="text-muted text-xs font-mono">{quote.symbol}</span>
              </div>
              <h2 className="text-xl font-black text-white">{quote.name}</h2>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted font-mono mb-0.5">결과 확인일</div>
              <div className="text-accent font-bold font-mono text-sm">{endDate}</div>
            </div>
          </div>

          {/* 현재가 */}
          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-3xl font-black font-mono text-white">
              {formatPrice(quote.price, mkt)}
            </span>
            <span className={`text-lg font-bold font-mono ${isUp ? 'text-up' : 'text-down'}`}>
              {isUp ? '▲' : '▼'} {Math.abs(quote.changePercent).toFixed(2)}%
            </span>
          </div>

          {/* 52주 레인지 */}
          <div>
            <div className="flex justify-between text-xs font-mono text-muted mb-1.5">
              <span>52주 최저 {formatPrice(quote.low52, mkt)}</span>
              <span className="text-accent font-bold">현재 {pricePos}% 위치</span>
              <span>52주 최고 {formatPrice(quote.high52, mkt)}</span>
            </div>
            <div className="h-2 bg-border rounded-full overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-down via-accent to-up rounded-full opacity-30"
                style={{ width: '100%' }}
              />
              <div
                className="absolute top-0 h-full w-1 bg-white rounded-full -translate-x-0.5 shadow-glow"
                style={{ left: `${pricePos}%` }}
              />
            </div>
          </div>

          {/* 거래량 */}
          {quote.avgVolume > 0 && (
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs text-muted font-mono">거래량</span>
              <span className={`text-xs font-mono font-bold ${
                quote.volume > quote.avgVolume * 1.2 ? 'text-up' : 'text-muted'
              }`}>
                평균 대비 {((quote.volume / quote.avgVolume) * 100).toFixed(0)}%
                {quote.volume > quote.avgVolume * 1.2 ? ' — 거래 활발' : ''}
              </span>
            </div>
          )}
        </div>
      </motion.div>

      {/* 기술적 신호 4개 */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
        <div className="text-xs font-mono text-muted mb-2">// 기술적 신호</div>
        <div className="grid grid-cols-2 gap-3">
          <SignalCard
            label="RSI(14)"
            value={`${rsi14} · ${rsiLabel(rsi14)}`}
            signal={rsiSignal}
            desc={rsiDesc}
          />
          <SignalCard
            label="MACD"
            value={macdSignal(macd.histogram)}
            signal={macdSignalType}
            desc={macdDesc}
          />
          <SignalCard
            label="볼린저밴드"
            value={bolPos}
            signal={bolSignal}
            desc={bolPos.includes('하단') ? '하단 근처. 반등 가능성'
              : bolPos.includes('상단') ? '상단 근처. 저항 가능성'
              : '중간 구간'}
          />
          <SignalCard
            label="이동평균"
            value={maAbove === 2 ? '강세' : maAbove === 0 ? '약세' : '혼조'}
            signal={maSignal}
            desc={maDesc}
          />
        </div>
      </motion.div>

      {/* 전문가 분석 */}
      {(analystTargetPrice || analystTotal > 0) && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
          <div className="text-xs font-mono text-muted mb-2">// 애널리스트</div>
          <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
            {analystTargetPrice && (
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted font-mono mb-0.5">평균 목표가</div>
                  <div className="text-lg font-black font-mono text-white">
                    {formatPrice(analystTargetPrice, mkt)}
                  </div>
                </div>
                {upside && (
                  <div className={`text-right`}>
                    <div className="text-xs text-muted font-mono mb-0.5">상승여력</div>
                    <div className={`text-2xl font-black font-mono ${Number(upside) > 0 ? 'text-up' : 'text-down'}`}>
                      {Number(upside) > 0 ? '+' : ''}{upside}%
                    </div>
                  </div>
                )}
              </div>
            )}
            {analystTotal > 0 && (
              <div>
                <div className="flex justify-between text-xs font-mono mb-2">
                  <span className="text-up">매수 {buyPct}%</span>
                  <span className="text-muted">중립 {holdPct}%</span>
                  <span className="text-down">매도 {sellPct}%</span>
                </div>
                <div className="h-3 rounded-full overflow-hidden flex gap-0.5">
                  <div className="bg-up rounded-l-full" style={{ width: `${buyPct}%` }} />
                  <div className="bg-border" style={{ width: `${holdPct}%` }} />
                  <div className="bg-down rounded-r-full" style={{ width: `${sellPct}%` }} />
                </div>
                <div className="text-xs text-muted mt-1.5 font-mono">
                  전문가 {analystCount ?? analystTotal}명 의견
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* 시장 심리 */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="text-xs font-mono text-muted mb-2">// 시장 심리</div>
        <div className="bg-surface border border-border rounded-xl p-5">
          {fearGreedValue != null && (
            <div className="flex items-center gap-4 mb-4 pb-4 border-b border-border/50">
              <div className="relative w-16 h-16 flex-shrink-0">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1E1E1E" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none"
                    stroke={fearGreedValue >= 60 ? '#00FF88' : fearGreedValue <= 30 ? '#FF4444' : '#FFD700'}
                    strokeWidth="3"
                    strokeDasharray={`${fearGreedValue} 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-sm font-black ${fearColor}`}>{fearGreedValue}</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted font-mono mb-0.5">공포·탐욕 지수</div>
                <div className={`text-xl font-black ${fearColor}`}>{fearGreedLabel}</div>
                <div className="text-xs text-muted mt-0.5">
                  {fearGreedValue >= 70 ? '시장이 과열. 조심할 타이밍'
                    : fearGreedValue >= 55 ? '낙관적인 분위기'
                    : fearGreedValue >= 45 ? '중립적인 분위기'
                    : fearGreedValue >= 30 ? '다소 불안한 분위기'
                    : '극도의 공포. 저점 매수 기회 가능성'}
                </div>
              </div>
            </div>
          )}
          {recentNews.length > 0 ? (
            <div className="space-y-3">
              <div className="text-xs text-muted font-mono">최근 주요 뉴스</div>
              {recentNews.map((n, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-1 flex-shrink-0 rounded-full bg-border mt-1" />
                  <div>
                    <div className="text-sm text-white/90 leading-snug">{n.headline}</div>
                    {n.date && <div className="text-xs text-muted mt-0.5">{n.date}</div>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted text-sm">최근 뉴스 없음</div>
          )}
        </div>
      </motion.div>

    </div>
  )
}
