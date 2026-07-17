'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import type { Battle } from '@/lib/types'
import { formatPercent } from '@/lib/stocks'
import CountdownTimer from './CountdownTimer'
import { useLocale } from '@/components/LocaleProvider'
import { localizedBattleToolName } from '@/lib/aiTools'

interface BattleResultCardProps {
  battle: Battle
  showLink?: boolean
}

export default function BattleResultCard({ battle, showLink = true }: BattleResultCardProps) {
  const { locale, tr } = useLocale()
  const aiToolName = localizedBattleToolName(battle.ai_tool_id, battle.ai_tool_name, locale)
  const isPending = battle.status === 'pending'
  const mkt = battle.stock_market as 'US' | 'KR'

  // ─── Resolved ────────────────────────────────────────────────
  if (!isPending) {
    const winner = battle.winner
    const userPct = battle.user_change_percent ?? 0
    const aiPct = battle.ai_change_percent ?? 0
    const actualPct = battle.actual_change_percent ?? 0

    const winnerLabel = winner === 'USER' ? tr('🏆 인간 승', '🏆 Human wins') : winner === 'AI' ? tr('🤖 AI 승', '🤖 AI wins') : tr('🤝 무승부', '🤝 Draw')
    const winnerColor = winner === 'USER' ? 'text-bg bg-up' : winner === 'AI' ? 'text-white bg-[#A78BFA]' : 'text-bg bg-accent'

    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface border border-border rounded-xl overflow-hidden"
      >
        {/* Header row */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-border">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span>{mkt === 'KR' ? '🇰🇷' : '🇺🇸'}</span>
              <span className="font-bold text-white text-sm">{battle.stock_name}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted">
              <span>{battle.created_at.slice(0, 10)}</span>
              <span>→</span>
              <span>{battle.end_date}</span>
            </div>
          </div>
          <span className={`text-xs font-bold font-mono px-2.5 py-1 rounded-lg ${winnerColor}`}>
            {winnerLabel}
          </span>
        </div>

        {/* Numbers */}
        <div className="grid grid-cols-3 gap-0 text-center divide-x divide-border px-0 py-3">
          <div className="px-3">
            <div className="text-[10px] text-muted font-mono mb-0.5">{tr('내 예측', 'My prediction')}</div>
            <div className={`text-base font-black font-mono ${userPct >= 0 ? 'text-up' : 'text-down'}`}>
              {formatPercent(userPct)}
            </div>
            {battle.user_error != null && (
              <div className="text-[10px] text-muted mt-0.5">{tr('오차', 'Error')} {battle.user_error.toFixed(1)}%p</div>
            )}
          </div>
          <div className="px-3">
            <div className="text-[10px] text-muted font-mono mb-0.5">{tr('실제', 'Actual')}</div>
            <div className={`text-base font-black font-mono ${actualPct >= 0 ? 'text-up' : 'text-down'}`}>
              {formatPercent(actualPct)}
            </div>
          </div>
          <div className="px-3">
            <div className="text-[10px] text-muted font-mono mb-0.5">{aiToolName} {tr('예측', 'prediction')}</div>
            <div className="text-base font-black font-mono text-[#A78BFA]">
              {formatPercent(aiPct)}
            </div>
            {battle.ai_error != null && (
              <div className="text-[10px] text-muted mt-0.5">{tr('오차', 'Error')} {battle.ai_error.toFixed(1)}%p</div>
            )}
          </div>
        </div>

        {showLink && (
          <div className="px-4 pb-4">
            <Link
              href={`/battle/${battle.id}`}
              className="block w-full text-center py-2 border border-white/20 text-white/70 rounded-lg text-xs font-mono hover:border-accent hover:text-accent transition-colors"
            >
              {tr('결과 보기', 'View result')} →
            </Link>
          </div>
        )}
      </motion.div>
    )
  }

  // ─── Pending ─────────────────────────────────────────────────
  const userPct = battle.user_change_percent ?? 0
  const aiPct = battle.ai_change_percent ?? 0
  const endDatetime = `${battle.end_date}T23:59:59+09:00`

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface border border-border rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span>{mkt === 'KR' ? '🇰🇷' : '🇺🇸'}</span>
            <span className="font-bold text-white text-sm">{battle.stock_name}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted">
            <span>{battle.created_at.slice(0, 10)}</span>
            <span>→</span>
            <span>{battle.end_date}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          <span className="text-accent text-xs font-mono">{tr('진행 중', 'In progress')}</span>
        </div>
      </div>

      {/* Predictions + countdown */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="grid grid-cols-2 gap-6 text-center">
          <div>
            <div className="text-[10px] text-muted font-mono mb-0.5">{tr('내 예측', 'My prediction')}</div>
            <div className={`text-base font-black font-mono ${userPct >= 0 ? 'text-up' : 'text-down'}`}>
              {formatPercent(userPct)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-muted font-mono mb-0.5">{aiToolName} {tr('예측', 'prediction')}</div>
            <div className="text-base font-black font-mono text-[#A78BFA]">
              {formatPercent(aiPct)}
            </div>
          </div>
        </div>
        <div className="text-right">
          <CountdownTimer endAt={endDatetime} compact />
        </div>
      </div>

      {showLink && (
        <div className="px-4 pb-4">
          <Link
            href={`/battle/${battle.id}`}
            className="block w-full text-center py-2 border border-white/20 text-white/70 rounded-lg text-xs font-mono hover:border-accent hover:text-accent transition-colors"
          >
            {tr('결과 보기', 'View result')} →
          </Link>
        </div>
      )}
    </motion.div>
  )
}
