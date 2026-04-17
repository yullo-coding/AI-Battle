'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import type { Battle, AIReasoning } from '@/lib/types'
import { formatPrice, formatPercent } from '@/lib/stocks'
import CountdownTimer from './CountdownTimer'

interface BattleResultCardProps {
  battle: Battle
  showLink?: boolean
}


export default function BattleResultCard({ battle, showLink = true }: BattleResultCardProps) {
  const isPending = battle.status === 'pending'
  const endDatetime = `${battle.end_date}T23:59:59+09:00`

  const mkt = battle.stock_market as 'US' | 'KR'

  // ─── Resolved ────────────────────────────────────────────────
  if (!isPending) {
    const winner = battle.winner
    const userPct = battle.user_change_percent ?? 0
    const aiPct = battle.ai_change_percent ?? 0
    const actualPct = battle.actual_change_percent ?? 0

    const winnerLabel = winner === 'USER' ? '🏆 인간 승리!' : winner === 'AI' ? '🤖 AI 승리!' : '🤝 무승부'
    const winnerColor = winner === 'USER' ? 'text-up' : winner === 'AI' ? 'text-[#7C3AED]' : 'text-accent'
    const winnerBg = winner === 'USER' ? 'bg-up/10 border-up/30' : winner === 'AI' ? 'bg-[#7C3AED]/10 border-[#7C3AED]/30' : 'bg-accent/10 border-accent/30'

    let reasoning: AIReasoning | null = null
    if (battle.ai_reasoning) {
      try { reasoning = JSON.parse(battle.ai_reasoning) as AIReasoning } catch { /* ignore */ }
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface border border-border rounded-xl overflow-hidden"
      >
        {/* Winner banner */}
        <div className={`border-b ${winnerBg} px-5 py-4 text-center`}>
          <div className={`text-2xl font-black ${winnerColor}`}>{winnerLabel}</div>
          <div className="text-xs text-muted font-mono mt-1">
            {battle.stock_name} · {battle.end_date}
          </div>
        </div>

        {/* Stock header */}
        <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <span>{mkt === 'KR' ? '🇰🇷' : '🇺🇸'}</span>
              <span className="text-muted text-xs font-mono">{battle.stock_symbol}</span>
            </div>
            <div className="font-bold text-white">{battle.stock_name}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted">시작가 → 종가</div>
            <div className="font-mono text-sm text-white">
              {formatPrice(battle.start_price, mkt)}
              {' → '}
              {battle.end_price ? formatPrice(battle.end_price, mkt) : '?'}
            </div>
          </div>
        </div>

        {/* Prediction comparison */}
        <div className="px-5 py-4">
          <div className="grid grid-cols-3 gap-3 text-center mb-4">
            <div>
              <div className="text-xs text-muted font-mono mb-1">내 예측</div>
              <div className={`text-xl font-black font-mono ${userPct >= 0 ? 'text-up' : 'text-down'}`}>
                {formatPercent(userPct)}
              </div>
              {battle.user_error != null && (
                <div className="text-xs text-muted mt-1">오차 {battle.user_error.toFixed(2)}%p</div>
              )}
            </div>
            <div>
              <div className="text-xs text-muted font-mono mb-1">실제</div>
              <div className={`text-xl font-black font-mono ${actualPct >= 0 ? 'text-up' : 'text-down'}`}>
                {formatPercent(actualPct)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted font-mono mb-1">AI 예측</div>
              <div className={`text-xl font-black font-mono text-[#7C3AED]`}>
                {formatPercent(aiPct)}
              </div>
              {battle.ai_error != null && (
                <div className="text-xs text-muted mt-1">오차 {battle.ai_error.toFixed(2)}%p</div>
              )}
            </div>
          </div>

          {/* Error bar */}
          {battle.user_error != null && battle.ai_error != null && (
            <div className="space-y-2">
              <div className="text-xs text-muted font-mono">오차 비교 (작을수록 좋음)</div>
              <div className="space-y-1.5">
                <div>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-up">나</span>
                    <span className={winner === 'USER' ? 'text-up font-bold' : 'text-muted'}>
                      {battle.user_error.toFixed(2)}%p {winner === 'USER' ? '✓' : ''}
                    </span>
                  </div>
                  <div className="h-1.5 bg-border rounded-full overflow-hidden">
                    <div className="h-full bg-up rounded-full" style={{ width: `${Math.min(100, battle.user_error * 5)}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-[#7C3AED]">AI</span>
                    <span className={winner === 'AI' ? 'text-[#7C3AED] font-bold' : 'text-muted'}>
                      {battle.ai_error.toFixed(2)}%p {winner === 'AI' ? '✓' : ''}
                    </span>
                  </div>
                  <div className="h-1.5 bg-border rounded-full overflow-hidden">
                    <div className="h-full bg-[#7C3AED] rounded-full" style={{ width: `${Math.min(100, battle.ai_error * 5)}%` }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* AI reasoning (collapsed summary) */}
        {reasoning?.conclusion && (
          <div className="mx-5 mb-4 p-3 bg-surface-2 rounded-lg border border-border">
            <div className="text-xs font-mono text-[#7C3AED] mb-1">// AI 분석 요약</div>
            <p className="text-xs text-white/70 leading-relaxed">{reasoning.conclusion}</p>
          </div>
        )}

        {showLink && (
          <div className="px-5 pb-5">
            <Link
              href={`/battle/${battle.id}`}
              className="block w-full text-center py-2.5 border border-border text-muted rounded-lg text-sm font-mono hover:border-accent hover:text-accent transition-colors"
            >
              결과 상세 →
            </Link>
          </div>
        )}
      </motion.div>
    )
  }

  // ─── Pending ─────────────────────────────────────────────────
  const userPct = battle.user_change_percent ?? 0
  const aiPct = battle.ai_change_percent ?? 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface border border-border rounded-xl overflow-hidden"
    >
      {/* Status bar */}
      <div className="bg-accent/10 border-b border-accent/30 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="text-accent text-xs font-mono font-bold">배틀 진행 중</span>
        </div>
        <span className="text-muted text-xs font-mono">{battle.end_date} 결과</span>
      </div>

      {/* Stock */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>{mkt === 'KR' ? '🇰🇷' : '🇺🇸'}</span>
          <div>
            <div className="font-bold text-white">{battle.stock_name}</div>
            <div className="text-muted text-xs font-mono">{battle.stock_symbol}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted">시작가</div>
          <div className="font-mono font-bold text-white">{formatPrice(battle.start_price, mkt)}</div>
        </div>
      </div>

      {/* Predictions */}
      <div className="px-5 py-4 grid grid-cols-2 gap-3 border-b border-border">
        <div className="text-center">
          <div className="text-xs text-muted font-mono mb-1">내 예측</div>
          <div className={`text-2xl font-black font-mono ${userPct >= 0 ? 'text-up' : 'text-down'}`}>
            {formatPercent(userPct)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-muted font-mono mb-1">AI 예측</div>
          <div className="text-2xl font-black font-mono text-[#7C3AED]">
            {formatPercent(aiPct)}
          </div>
          {battle.ai_confidence && (
            <div className="text-xs text-muted mt-1">신뢰도 {battle.ai_confidence}%</div>
          )}
        </div>
      </div>

      {/* Countdown */}
      <div className="px-5 py-5">
        <CountdownTimer endAt={endDatetime} />
      </div>

      {showLink && (
        <div className="px-5 pb-5">
          <Link
            href={`/battle/${battle.id}`}
            className="block w-full text-center py-2.5 border border-border text-muted rounded-lg text-sm font-mono hover:border-accent hover:text-accent transition-colors"
          >
            결과 페이지 →
          </Link>
        </div>
      )}
    </motion.div>
  )
}
