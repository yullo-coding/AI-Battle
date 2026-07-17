'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import type { Battle, AIReasoning } from '@/lib/types'
import type { AIPrediction } from '@/lib/claude'
import CountdownTimer from './CountdownTimer'
import { useLocale } from '@/components/LocaleProvider'

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
    ai: 'text-[#A78BFA] border-[#A78BFA]/40 bg-[#A78BFA]/5',
  }
  return (
    <div className={`border rounded-xl p-5 text-center ${colorMap[color]}`}>
      <div className="text-xs font-mono text-muted mb-2">{label}</div>
      <div className={`text-4xl font-black font-mono ${color === 'ai' ? 'text-[#A78BFA]' : color === 'up' ? 'text-up' : color === 'down' ? 'text-down' : 'text-accent'}`}>
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
      <div className="text-xs font-mono text-[#A78BFA] mb-2">{title}</div>
      <p className="text-sm text-white/80 leading-relaxed">{content}</p>
    </div>
  )
}

export default function AIPredictionResult({ battle, aiPrediction }: AIPredictionResultProps) {
  const { tr } = useLocale()
  const [showReasoning, setShowReasoning] = useState(false)

  const userPct = battle.user_change_percent ?? 0
  const aiPct = aiPrediction.change_percent

  const userColor = userPct > 0 ? 'up' : userPct < 0 ? 'down' : 'neutral'

  const reasoning = aiPrediction.reasoning as AIReasoning

  // end_date → ISO datetime (end of day KST)
  const endDatetime = `${battle.end_date}T23:59:59+09:00`

  return (
    <div className="space-y-6">

      {/* Brief */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#A78BFA]/10 border border-[#A78BFA]/30 rounded-xl p-4"
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[#A78BFA] text-xs font-mono"></span>
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
          label={tr('내 예측', 'My prediction')}
          value={`${userPct > 0 ? '+' : ''}${userPct.toFixed(1)}%`}
          color={userColor as 'up' | 'down' | 'neutral'}
        />
        <PredictionBox
          label={tr('AI 예측', 'AI prediction')}
          value={`${aiPct > 0 ? '+' : ''}${aiPct.toFixed(1)}%`}
          color="ai"
          badge={`${tr('신뢰도', 'Confidence')} ${aiPrediction.confidence}%`}
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
          <span className="text-muted">{tr('AI 신뢰도', 'AI confidence')}</span>
          <span className="text-[#A78BFA] font-bold">{aiPrediction.confidence}%</span>
        </div>
        <div className="h-2 bg-border rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${aiPrediction.confidence}%` }}
            transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
            className="h-full bg-[#A78BFA] rounded-full"
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
          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/60"
        >
          <span className="font-mono text-sm font-bold text-white">{battle.ai_tool_name ?? tr('AI 도구', 'AI tool')} {tr('상세 분석', 'analysis details')}</span>
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
                <ReasoningSection title={tr('기술적 지표', 'Technical indicators')} content={reasoning.technical} />
                <ReasoningSection title={tr('시장 심리', 'Market sentiment')} content={reasoning.sentiment} />
                <ReasoningSection title={tr('리스크', 'Risks')} content={reasoning.risk} />
                <ReasoningSection title={tr('종합 결론', 'Conclusion')} content={reasoning.conclusion} />
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
          {tr('결과 확인 날짜', 'Result date')}: <span className="text-accent">{battle.end_date}</span>
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
          {tr('결과 보기', 'View result')} →
        </Link>
        <Link
          href="/my-battles"
          className="w-full py-3 bg-accent text-bg font-bold rounded-lg hover:bg-accent-dim transition-colors text-center"
        >
          {tr('내 배틀 전적 보기', 'View My Battle Record')}
        </Link>
      </motion.div>
    </div>
  )
}
