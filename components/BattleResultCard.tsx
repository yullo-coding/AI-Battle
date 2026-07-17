'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import Button from '@vibe/design-system/components/ui/Button'
import type { Battle } from '@/lib/types'
import { formatPercent } from '@/lib/stocks'
import CountdownTimer from './CountdownTimer'
import { useLocale } from '@/components/LocaleProvider'
import { localizedBattleToolName } from '@/lib/aiTools'

interface BattleResultCardProps {
  battle: Battle
  showLink?: boolean
}

interface MetricProps {
  label: string
  value: string
  color: string
  detail?: string
  highlight?: boolean
}

function Metric({ label, value, color, detail, highlight = false }: MetricProps) {
  return (
    <div className={`rounded-xl border p-3.5 sm:p-4 ${highlight ? 'border-white/25 bg-white/[0.055]' : 'border-border bg-bg/35'}`}>
      <div className="text-[11px] sm:text-xs text-muted mb-1.5">{label}</div>
      <div className={`text-xl sm:text-2xl font-black font-mono ${color}`}>{value}</div>
      {detail && <div className="text-[11px] sm:text-xs text-muted mt-1.5">{detail}</div>}
    </div>
  )
}

export default function BattleResultCard({ battle, showLink = true }: BattleResultCardProps) {
  const { locale, tr } = useLocale()
  const aiToolName = localizedBattleToolName(battle.ai_tool_id, battle.ai_tool_name, locale)
  const isPending = battle.status === 'pending'
  const mkt = battle.stock_market as 'US' | 'KR'
  const startDate = battle.created_at.slice(0, 10)
  const userPct = battle.user_change_percent ?? 0
  const aiPct = battle.ai_change_percent ?? 0

  if (!isPending) {
    const winner = battle.winner
    const actualPct = battle.actual_change_percent ?? 0
    const roundedUserError = Number((battle.user_error ?? 0).toFixed(1))
    const roundedAiError = Number((battle.ai_error ?? 0).toFixed(1))
    const accuracyGap = Math.abs(roundedUserError - roundedAiError)
    const winnerLabel = winner === 'USER'
      ? tr('🏆 인간 승리', '🏆 Human wins')
      : winner === 'AI'
        ? tr('🤖 AI 승리', '🤖 AI wins')
        : tr('🤝 무승부', '🤝 Draw')
    const winnerColor = winner === 'USER'
      ? 'text-bg bg-up'
      : winner === 'AI'
        ? 'text-bg bg-[#A78BFA]'
        : 'text-bg bg-white/80'
    const resultMessage = winner === 'USER'
      ? tr(`내 예측이 AI보다 ${accuracyGap.toFixed(1)}%p 더 정확했어요.`, `Your prediction was ${accuracyGap.toFixed(1)}%p more accurate than the AI.`)
      : winner === 'AI'
        ? tr(`AI 예측이 나보다 ${accuracyGap.toFixed(1)}%p 더 정확했어요.`, `The AI was ${accuracyGap.toFixed(1)}%p more accurate than you.`)
        : tr('나와 AI의 예측 오차가 같았어요.', 'You and the AI had the same prediction error.')

    return (
      <motion.article
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-2xl border border-border bg-surface"
      >
        <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">{mkt === 'KR' ? '🇰🇷' : '🇺🇸'}</span>
              <h3 className="text-base sm:text-lg font-black text-white">{battle.stock_name}</h3>
              <span className="text-xs font-mono text-muted">{battle.stock_symbol}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] sm:text-xs text-muted">
              <span>{tr('배틀 시작', 'Started')} <strong className="ml-1 font-mono font-normal text-white/80">{startDate}</strong></span>
              <span>{tr('결과 확인', 'Result date')} <strong className="ml-1 font-mono font-normal text-white/80">{battle.end_date}</strong></span>
            </div>
          </div>
          <span className={`w-fit rounded-lg px-3 py-1.5 text-xs font-black ${winnerColor}`}>{winnerLabel}</span>
        </div>

        <div className="p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2 text-xs sm:text-sm">
            <span className="text-muted">{tr('대결 AI', 'Opponent')}</span>
            <span className="min-w-0 truncate font-bold text-[#C4B5FD]">{aiToolName}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <Metric
              label={tr('내 예측', 'My prediction')}
              value={formatPercent(userPct)}
              color={userPct >= 0 ? 'text-up' : 'text-down'}
              detail={battle.user_error != null ? tr(`오차 ${battle.user_error.toFixed(1)}%p`, `Error ${battle.user_error.toFixed(1)}%p`) : undefined}
            />
            <Metric
              label={tr('실제 등락', 'Actual move')}
              value={formatPercent(actualPct)}
              color={actualPct >= 0 ? 'text-up' : 'text-down'}
              detail={tr('최종 주가 기준', 'Final price')}
              highlight
            />
            <Metric
              label={tr('AI 예측', 'AI prediction')}
              value={formatPercent(aiPct)}
              color="text-[#A78BFA]"
              detail={battle.ai_error != null ? tr(`오차 ${battle.ai_error.toFixed(1)}%p`, `Error ${battle.ai_error.toFixed(1)}%p`) : undefined}
            />
          </div>

          <div className={`mt-3 rounded-xl border px-4 py-3 text-sm font-bold ${winner === 'USER' ? 'border-up/25 bg-up/[0.06] text-up' : winner === 'AI' ? 'border-[#A78BFA]/30 bg-[#A78BFA]/[0.07] text-[#C4B5FD]' : 'border-white/20 bg-white/[0.04] text-white'}`}>
            {resultMessage}
          </div>

          {showLink && (
            <Link href={`/battle/${battle.id}`} className="mt-4 block">
              <Button size="sm" variant="secondary" className="w-full">
                {tr('상세 결과 보기', 'View detailed result')} →
              </Button>
            </Link>
          )}
        </div>
      </motion.article>
    )
  }

  const endDatetime = `${battle.end_date}T23:59:59+09:00`

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl border border-border bg-surface"
    >
      <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">{mkt === 'KR' ? '🇰🇷' : '🇺🇸'}</span>
            <h3 className="text-base sm:text-lg font-black text-white">{battle.stock_name}</h3>
            <span className="text-xs font-mono text-muted">{battle.stock_symbol}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] sm:text-xs text-muted">
            <span>{tr('배틀 시작', 'Started')} <strong className="ml-1 font-mono font-normal text-white/80">{startDate}</strong></span>
            <span>{tr('결과 확인', 'Result date')} <strong className="ml-1 font-mono font-normal text-white/80">{battle.end_date}</strong></span>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-accent/25 bg-accent/[0.06] px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
          <span className="text-xs font-bold text-accent">{tr('배틀 진행 중', 'Battle in progress')}</span>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2 text-xs sm:text-sm">
          <span className="text-muted">{tr('대결 AI', 'Opponent')}</span>
          <span className="min-w-0 truncate font-bold text-[#C4B5FD]">{aiToolName}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Metric label={tr('내 예측', 'My prediction')} value={formatPercent(userPct)} color={userPct >= 0 ? 'text-up' : 'text-down'} />
          <Metric label={tr('AI 예측', 'AI prediction')} value={formatPercent(aiPct)} color="text-[#A78BFA]" />
        </div>
        <div className="mt-3 flex flex-col gap-2 rounded-xl border border-border bg-bg/35 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-muted">{tr('결과일까지 남은 시간', 'Time until result')}</span>
          <CountdownTimer endAt={endDatetime} compact />
        </div>
        {showLink && (
          <Link href={`/battle/${battle.id}`} className="mt-4 block">
            <Button size="sm" variant="secondary" className="w-full">
              {tr('배틀 상세 보기', 'View battle details')} →
            </Button>
          </Link>
        )}
      </div>
    </motion.article>
  )
}
