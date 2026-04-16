'use client'

import { motion } from 'framer-motion'
import type { Direction } from '@/lib/types'

interface ResultBannerProps {
  userPrediction: Direction
  aiPrediction: Direction
  startPrice: number
  endPrice: number
  stockName: string
  market: 'US' | 'KR'
}

export default function ResultBanner({
  userPrediction,
  aiPrediction,
  startPrice,
  endPrice,
  stockName,
  market,
}: ResultBannerProps) {
  const actualDirection: Direction = endPrice >= startPrice ? 'UP' : 'DOWN'
  const priceChange = ((endPrice - startPrice) / startPrice) * 100
  const userWon = userPrediction === actualDirection
  const aiWon = aiPrediction === actualDirection

  const fmtPrice = (p: number) =>
    market === 'KR' ? `₩${p.toLocaleString('ko-KR')}` : `$${p.toFixed(2)}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl overflow-hidden border border-border"
    >
      {/* Result header */}
      <div
        className={`p-6 text-center ${
          userWon ? 'bg-gradient-to-r from-accent/10 to-accent/5' : 'bg-gradient-to-r from-danger/10 to-danger/5'
        }`}
      >
        <div className="text-5xl mb-3">{userWon ? '🏆' : '💀'}</div>
        <h2 className={`text-3xl font-bold ${userWon ? 'text-accent' : 'text-danger'}`}>
          {userWon ? '승리!' : '패배'}
        </h2>
        <p className="text-muted mt-1">{stockName} 배틀 결과</p>
      </div>

      {/* Price result */}
      <div className="bg-surface p-6 border-t border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs text-muted font-mono mb-1">START_PRICE</div>
            <div className="text-white font-bold">{fmtPrice(startPrice)}</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold font-mono ${priceChange >= 0 ? 'text-up' : 'text-down'}`}>
              {priceChange >= 0 ? '▲' : '▼'} {Math.abs(priceChange).toFixed(2)}%
            </div>
            <div className="text-xs text-muted">실제 변동</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted font-mono mb-1">END_PRICE</div>
            <div className="text-white font-bold">{fmtPrice(endPrice)}</div>
          </div>
        </div>
      </div>

      {/* Human vs AI comparison */}
      <div className="grid grid-cols-2 border-t border-border">
        <PredictionResult
          label="나의 예측"
          color="human"
          prediction={userPrediction}
          won={userWon}
        />
        <PredictionResult
          label="AI 예측"
          color="ai"
          prediction={aiPrediction}
          won={aiWon}
          isRight
        />
      </div>
    </motion.div>
  )
}

function PredictionResult({
  label,
  color,
  prediction,
  won,
  isRight,
}: {
  label: string
  color: 'human' | 'ai'
  prediction: Direction
  won: boolean
  isRight?: boolean
}) {
  return (
    <div
      className={`p-6 text-center ${isRight ? '' : 'border-r border-border'}`}
    >
      <div className={`tag mb-2 text-${color}`}>{label}</div>
      <div
        className={`text-2xl font-bold font-mono mb-2 ${
          prediction === 'UP' ? 'text-up' : 'text-down'
        }`}
      >
        {prediction === 'UP' ? '▲ UP' : '▼ DOWN'}
      </div>
      <div className={`text-sm font-bold ${won ? 'text-win' : 'text-lose'}`}>
        {won ? '✓ 맞음' : '✗ 틀림'}
      </div>
    </div>
  )
}
