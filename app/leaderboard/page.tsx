'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { getSupabase } from '@/lib/supabase'
import type { Battle } from '@/lib/types'
import { parseBattle } from '@/lib/types'
import { formatPercent } from '@/lib/stocks'

interface StockStat {
  symbol: string
  name: string
  total: number
  userWins: number
  aiWins: number
  ties: number
}

export default function LeaderboardPage() {
  const [loading, setLoading] = useState(true)
  const [battles, setBattles] = useState<Battle[]>([])

  useEffect(() => {
    async function fetchData() {
      const sb = getSupabase()
      if (!sb) return

      const { data } = await sb
        .from('battles')
        .select('*')
        .eq('status', 'resolved')
        .order('created_at', { ascending: false })

      if (data) setBattles(data.map(r => parseBattle(r as Record<string, unknown>)))
      setLoading(false)
    }
    fetchData()
  }, [])

  const userWinsTotal = battles.filter(b => b.winner === 'USER').length
  const aiWinsTotal = battles.filter(b => b.winner === 'AI').length
  const tiesTotal = battles.filter(b => b.winner === 'TIE').length
  const total = battles.length

  const userWinRate = total > 0 ? Math.round((userWinsTotal / total) * 100) : 0
  const aiWinRate = total > 0 ? Math.round((aiWinsTotal / total) * 100) : 0

  // Per-stock stats
  const stockMap: Record<string, StockStat> = {}
  battles.forEach(b => {
    if (!stockMap[b.stock_symbol]) {
      stockMap[b.stock_symbol] = { symbol: b.stock_symbol, name: b.stock_name, total: 0, userWins: 0, aiWins: 0, ties: 0 }
    }
    stockMap[b.stock_symbol].total++
    if (b.winner === 'USER') stockMap[b.stock_symbol].userWins++
    else if (b.winner === 'AI') stockMap[b.stock_symbol].aiWins++
    else stockMap[b.stock_symbol].ties++
  })
  const stockStats = Object.values(stockMap).sort((a, b) => b.total - a.total)

  return (
    <main className="min-h-screen bg-bg">
      {/* Nav */}
      <div className="border-b border-border bg-surface/50">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-muted hover:text-white transition-colors font-mono text-sm">
            ← 홈
          </Link>
          <Link href="/battle/new" className="text-accent font-mono text-sm hover:text-accent-dim transition-colors">
            배틀 참전 ⚔️
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="tag text-accent mb-2">// LEADERBOARD</div>
          <h1 className="text-3xl font-black text-white mb-2">인간 vs AI 전적</h1>
          <p className="text-muted mb-10">종료된 배틀의 통합 승패 기록입니다.</p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : total === 0 ? (
          <div className="text-center py-20 space-y-4">
            <div className="text-5xl">⚔️</div>
            <p className="text-muted">아직 종료된 배틀이 없습니다.</p>
            <Link href="/battle/new" className="inline-block px-6 py-3 bg-accent text-bg font-bold rounded-lg hover:bg-accent-dim transition-colors">
              첫 배틀 시작하기
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Scorecards */}
            <div className="grid grid-cols-2 gap-4">
              <ScoreCard label="인간 통합 전적" color="up" wins={userWinsTotal} total={total} winRate={userWinRate} />
              <ScoreCard label="AI (Claude) 전적" color="ai" wins={aiWinsTotal} total={total} winRate={aiWinRate} />
            </div>

            {/* Win rate bar */}
            <div className="bg-surface rounded-xl p-4 border border-border">
              <div className="flex justify-between text-xs font-mono mb-2">
                <span className="text-up">인간 {userWinRate}%</span>
                {tiesTotal > 0 && <span className="text-muted">무승부 {tiesTotal}회</span>}
                <span className="text-[#7C3AED]">AI {aiWinRate}%</span>
              </div>
              <div className="h-3 bg-border rounded-full overflow-hidden flex">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${userWinRate}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="bg-up"
                />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${aiWinRate}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                  className="bg-[#7C3AED]"
                />
              </div>
            </div>

            {/* Per-stock breakdown */}
            {stockStats.length > 0 && (
              <div>
                <div className="tag text-muted mb-4">// PER_STOCK</div>
                <div className="space-y-3">
                  {stockStats.map((s, i) => (
                    <motion.div
                      key={s.symbol}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-4 bg-surface border border-border rounded-lg px-4 py-3"
                    >
                      <div className="flex-1">
                        <div className="font-bold text-white text-sm">{s.name}</div>
                        <div className="text-xs text-muted font-mono">{s.symbol} · {s.total}전</div>
                      </div>
                      <div className="flex gap-4 text-center text-sm">
                        <div>
                          <div className="text-xs text-muted mb-0.5">인간</div>
                          <div className="font-bold text-up">{s.userWins}승</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted mb-0.5">AI</div>
                          <div className="font-bold text-[#7C3AED]">{s.aiWins}승</div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent battles */}
            <div>
              <div className="tag text-muted mb-4">// RECENT_RESULTS</div>
              <div className="space-y-2">
                {battles.slice(0, 20).map((b, i) => (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-3 bg-surface border border-border rounded-lg px-4 py-2.5 text-sm"
                  >
                    <div className={`text-xs font-bold font-mono w-16 ${
                      b.winner === 'USER' ? 'text-up' : b.winner === 'AI' ? 'text-[#7C3AED]' : 'text-muted'
                    }`}>
                      {b.winner === 'USER' ? '인간 승' : b.winner === 'AI' ? 'AI 승' : '무승부'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-white font-medium">{b.stock_name}</span>
                      <span className="text-muted text-xs font-mono ml-2">{b.end_date}</span>
                    </div>
                    <div className="text-xs font-mono text-muted hidden sm:flex gap-3">
                      <span>나 {formatPercent(b.user_change_percent ?? 0)}</span>
                      <span className="text-[#7C3AED]">AI {formatPercent(b.ai_change_percent ?? 0)}</span>
                      <span className={b.actual_change_percent != null && b.actual_change_percent >= 0 ? 'text-up' : 'text-down'}>
                        실 {b.actual_change_percent != null ? formatPercent(b.actual_change_percent) : '?'}
                      </span>
                    </div>
                    <Link
                      href={`/battle/${b.id}`}
                      className="text-xs text-muted font-mono hover:text-accent transition-colors flex-shrink-0"
                    >
                      →
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

function ScoreCard({
  label, color, wins, total, winRate
}: {
  label: string
  color: 'up' | 'ai'
  wins: number
  total: number
  winRate: number
}) {
  const c = color === 'up' ? { text: 'text-up', border: 'border-up/30', bg: 'bg-up/5' } : { text: 'text-[#7C3AED]', border: 'border-[#7C3AED]/30', bg: 'bg-[#7C3AED]/5' }
  return (
    <div className={`bg-surface border ${c.border} ${c.bg} rounded-xl p-6 text-center`}>
      <div className={`tag mb-2 ${c.text}`}>{label}</div>
      <div className={`text-4xl font-black font-mono text-white mb-1`}>{winRate}%</div>
      <div className="text-muted text-sm font-mono">{wins}승 / {total}전</div>
    </div>
  )
}
