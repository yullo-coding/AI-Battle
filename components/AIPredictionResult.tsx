'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import type { Battle, AIReasoning } from '@/lib/types'
import type { AIPrediction } from '@/lib/claude'
import CountdownTimer from './CountdownTimer'

interface AIPredictionResultProps {
  battle: Battle
  aiPrediction: AIPrediction
}

function PredictionBox({
  label, value, color, badge
}: {
  label: string
  value: string
  color: 'up' | 'down' | 'neutral' | 'ai'
  badge?: string
}) {
  const colorMap = {
    up: 'text-up border-up/40 bg-up/5',
    down: 'text-down border-down/40 bg-down/5',
    neutral: 'text-accent border-accent/40 bg-accent/5',
    ai: 'text-[#7C3AED] border-[#7C3AED]/40 bg-[#7C3AED]/5',
  }
  return (
    <div className={`border rounded-xl p-5 text-center ${colorMap[color]}`}>
      <div className="text-xs font-mono text-muted mb-2">{label}</div>
      <div className={`text-4xl font-black font-mono ${color === 'ai' ? 'text-[#7C3AED]' : color === 'up' ? 'text-up' : color === 'down' ? 'text-down' : 'text-accent'}`}>
        {value}
      </div>
      {badge && (
        <div className="mt-2 text-xs font-mono text-muted">{badge}</div>
      )}
    </div>
  )
}

function ReasoningSection({ title, content }: { title: string; content: string }) {
  return (
    <div className="border-b border-border/50 pb-4 last:border-0 last:pb-0">
      <div className="text-xs font-mono text-[#7C3AED] mb-2">{title}</div>
      <p className="text-sm text-white/80 leading-relaxed">{content}</p>
    </div>
  )
}

export default function AIPredictionResult({ battle, aiPrediction }: AIPredictionResultProps) {
  const [showReasoning, setShowReasoning] = useState(false)

  const userPct = battle.user_change_percent ?? 0
  const aiPct = aiPrediction.change_percent

  const userColor = userPct > 0 ? 'up' : userPct < 0 ? 'down' : 'neutral'

  const reasoning = aiPrediction.reasoning as AIReasoning

  // end_date → ISO datetime (end of day KST)
  const endDatetime = `${battle.end_date}T23:59:59+09:00`

  return (
    <div className="space-y-6">
      <div className="tag text-accent">// STEP_6 — AI 예측 공개</div>

      {/* Brief */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#7C3AED]/10 border border-[#7C3AED]/30 rounded-xl p-4"
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[#7C3AED] text-xs font-mono">// CLAUDE_BRIEF</span>
        </div>
        <p className="text-white font-bold">{aiPrediction.brief}</p>
      </motion.div>

      {/* Predictions comparison */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 gap-3"
      >
        <PredictionBox
          label="// 내 예측"
          value={`${userPct > 0 ? '+' : ''}${userPct.toFixed(1)}%`}
          color={userColor as 'up' | 'down' | 'neutral'}
        />
        <PredictionBox
          label="// AI 예측"
          value={`${aiPct > 0 ? '+' : ''}${aiPct.toFixed(1)}%`}
          color="ai"
          badge={`신뢰도 ${aiPrediction.confidence}%`}
        />
      </motion.div>

      {/* Confidence bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-surface border border-border rounded-xl p-4"
      >
        <div className="flex justify-between text-xs font-mono mb-2">
          <span className="text-muted">AI 신뢰도</span>
          <span className="text-[#7C3AED] font-bold">{aiPrediction.confidence}%</span>
        </div>
        <div className="h-2 bg-border rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${aiPrediction.confidence}%` }}
            transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
            className="h-full bg-[#7C3AED] rounded-full"
          />
        </div>
        <div className="flex justify-between text-xs text-muted mt-1">
          <span>60</span><span>75</span><span>90</span>
        </div>
      </motion.div>

      {/* Reasoning accordion */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-surface border border-border rounded-xl overflow-hidden"
      >
        <button
          onClick={() => setShowReasoning(p => !p)}
          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/5 transition-colors"
        >
          <span className="font-mono text-sm font-bold text-white">// Claude 상세 분석</span>
          <span className="text-muted text-lg">{showReasoning ? '▲' : '▼'}</span>
        </button>
        <AnimatePresence>
          {showReasoning && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
                <ReasoningSection title="// 기술적 지표" content={reasoning.technical} />
                <ReasoningSection title="// 시장 심리" content={reasoning.sentiment} />
                <ReasoningSection title="// 리스크" content={reasoning.risk} />
                <ReasoningSection title="// 종합 결론" content={reasoning.conclusion} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Countdown */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-surface border border-border rounded-xl p-5"
      >
        <div className="text-xs text-muted font-mono text-center mb-4">
          결과 확인 날짜: <span className="text-accent">{battle.end_date}</span>
        </div>
        <CountdownTimer endAt={endDatetime} />
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="flex flex-col gap-3"
      >
        <Link
          href={`/battle/${battle.id}`}
          className="w-full py-3 border border-border text-muted rounded-lg text-sm font-mono hover:border-white hover:text-white transition-colors text-center"
        >
          결과 페이지 바로가기 →
        </Link>
        <Link
          href="/my-battles"
          className="w-full py-3 bg-accent text-bg font-bold rounded-lg hover:bg-accent-dim transition-colors text-center"
        >
          내 배틀 전적 보기
        </Link>
      </motion.div>
    </div>
  )
}
