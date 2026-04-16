'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import Link from 'next/link'
import type { BattleRound } from '@/lib/types'
import { formatPrice } from '@/lib/stocks'
import CountdownTimer from './CountdownTimer'

interface BattleCardProps {
  round: BattleRound
  currentPrice?: number
  changePercent?: number
  userPrediction?: string | null
  index?: number
}

export default function BattleCard({
  round,
  currentPrice,
  changePercent,
  userPrediction,
  index = 0,
}: BattleCardProps) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })

  const isEnded = round.status === 'ended'
  const hasUserPrediction = !!userPrediction

  const marketFlag = round.stock_market === 'KR' ? '🇰🇷' : '🇺🇸'
  const price = currentPrice ?? round.start_price
  const fmtPrice = price ? formatPrice(price, round.stock_market) : '—'

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay: index * 0.08 }}
    >
      <Link href={`/battle/${round.id}`}>
        <div
          className={`bg-surface border rounded-xl p-6 cursor-pointer card-hover transition-all duration-200 ${
            hasUserPrediction ? 'border-accent/40' : 'border-border hover:border-[#333]'
          }`}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span>{marketFlag}</span>
                <span className="tag text-muted">{round.stock_symbol}</span>
              </div>
              <h3 className="text-xl font-bold text-white">{round.stock_name}</h3>
            </div>
            <StatusBadge status={round.status} hasUserPrediction={hasUserPrediction} />
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3 mb-5">
            <span className="text-2xl font-bold font-mono text-white">{fmtPrice}</span>
            {changePercent !== undefined && (
              <span className={`text-sm font-mono font-bold ${changePercent >= 0 ? 'text-up' : 'text-down'}`}>
                {changePercent >= 0 ? '▲' : '▼'} {Math.abs(changePercent).toFixed(2)}%
              </span>
            )}
          </div>

          {/* AI Prediction preview */}
          {round.ai_prediction && (
            <div className="flex items-center gap-3 bg-surface-2 rounded-lg p-3 mb-4 border border-border">
              <div className="text-xs text-ai font-mono font-bold shrink-0">AI 예측</div>
              <div className={`font-bold font-mono ${round.ai_prediction === 'UP' ? 'text-up' : 'text-down'}`}>
                {round.ai_prediction === 'UP' ? '▲ UP' : '▼ DOWN'}
              </div>
              {round.ai_confidence && (
                <div className="text-muted text-xs font-mono ml-auto">신뢰도 {round.ai_confidence}%</div>
              )}
            </div>
          )}

          {/* User status or countdown */}
          {isEnded ? (
            <div className="text-center text-sm text-muted font-mono">// BATTLE_ENDED</div>
          ) : hasUserPrediction ? (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">내 예측:</span>
              <span className={`font-bold font-mono ${userPrediction === 'UP' ? 'text-up' : 'text-down'}`}>
                {userPrediction === 'UP' ? '▲ UP' : '▼ DOWN'}
              </span>
            </div>
          ) : (
            <div className="text-center">
              <CountdownTimer endAt={round.end_at} />
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  )
}

function StatusBadge({ status, hasUserPrediction }: { status: string; hasUserPrediction: boolean }) {
  if (status === 'ended') {
    return (
      <span className="px-2 py-1 rounded text-xs font-mono bg-border text-muted">종료</span>
    )
  }
  if (hasUserPrediction) {
    return (
      <span className="px-2 py-1 rounded text-xs font-mono bg-accent/20 text-accent">참전중</span>
    )
  }
  return (
    <span className="px-2 py-1 rounded text-xs font-mono bg-danger/20 text-danger animate-pulse">진행중</span>
  )
}
