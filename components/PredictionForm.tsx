'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import type { Direction } from '@/lib/types'

interface PredictionFormProps {
  onSubmit: (prediction: Direction, periodDays: number) => Promise<void>
  aiPrediction: Direction | null
  disabled?: boolean
}

export default function PredictionForm({ onSubmit, aiPrediction, disabled }: PredictionFormProps) {
  const [selected, setSelected] = useState<Direction | null>(null)
  const [days, setDays] = useState(3)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!selected || submitting || disabled) return
    setSubmitting(true)
    setError('')
    try {
      await onSubmit(selected, days)
    } catch {
      setError('제출 실패. 다시 시도해주세요.')
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Direction selector */}
      <div>
        <div className="tag text-muted mb-3">// YOUR_PREDICTION</div>
        <div className="grid grid-cols-2 gap-3">
          {(['UP', 'DOWN'] as Direction[]).map(dir => (
            <motion.button
              key={dir}
              onClick={() => !disabled && setSelected(dir)}
              whileTap={{ scale: 0.97 }}
              disabled={disabled}
              className={`relative py-6 rounded-xl border-2 transition-all duration-200 font-bold text-xl ${
                selected === dir
                  ? dir === 'UP'
                    ? 'border-up bg-up/10 text-up glow-green'
                    : 'border-down bg-down/10 text-down glow-red'
                  : 'border-border text-muted hover:border-[#333]'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="text-3xl mb-1">{dir === 'UP' ? '▲' : '▼'}</div>
              <div className="font-mono">{dir}</div>
              {aiPrediction === dir && (
                <div className="absolute top-2 right-2 text-xs bg-ai/20 text-ai px-2 py-0.5 rounded font-mono">
                  AI
                </div>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Period selector */}
      <div>
        <div className="tag text-muted mb-3">
          {'// BATTLE_PERIOD: '}<span className="text-accent">{days}일</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted font-mono">1일</span>
          <input
            type="range"
            min={1}
            max={7}
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            disabled={disabled}
            className="flex-1 accent-accent cursor-pointer"
          />
          <span className="text-sm text-muted font-mono">7일</span>
        </div>
        <div className="flex justify-between mt-2 px-0">
          {[1,2,3,4,5,6,7].map(d => (
            <button
              key={d}
              onClick={() => !disabled && setDays(d)}
              className={`w-8 h-8 rounded font-mono text-xs transition-colors ${
                days === d
                  ? 'bg-accent text-bg font-bold'
                  : 'text-muted hover:text-white'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Submit */}
      {error && <p className="text-danger text-sm">{error}</p>}

      <motion.button
        onClick={handleSubmit}
        disabled={!selected || submitting || disabled}
        whileTap={{ scale: 0.98 }}
        className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-200 ${
          selected && !submitting && !disabled
            ? 'bg-accent text-bg btn-pulse cursor-pointer hover:bg-accent-dim'
            : 'bg-border text-muted cursor-not-allowed'
        }`}
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" />
            제출 중...
          </span>
        ) : (
          `⚔️ ${selected ? `${days}일 ${selected === 'UP' ? '상승' : '하락'} 예측 제출` : '방향을 선택하세요'}`
        )}
      </motion.button>
    </div>
  )
}
