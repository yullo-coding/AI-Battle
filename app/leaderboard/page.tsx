'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'
import type { Battle } from '@/lib/types'
import { parseBattle } from '@/lib/types'
import { formatPercent } from '@/lib/stocks'
import Button from '@vibe/design-system/components/ui/Button'
import { useLocale } from '@/components/LocaleProvider'

interface UserStat {
  email: string
  nickname: string
  total: number
  wins: number
  losses: number
  ties: number
  winRate: number
  avgUserError: number
}

interface StockStat {
  symbol: string
  name: string
  market: string
  total: number
  userWins: number
  aiWins: number
  ties: number
}

export default function LeaderboardPage() {
  const { tr } = useLocale()
  const [loading, setLoading] = useState(true)
  const [battles, setBattles] = useState<Battle[]>([])
  const [allBattles, setAllBattles] = useState<Battle[]>([])
  const [nicknames, setNicknames] = useState<Record<string, string>>({})
  const [tab, setTab] = useState<'users' | 'stocks' | 'recent'>('users')

  useEffect(() => {
    async function fetchData() {
      const sb = getSupabase()
      if (!sb) return

      const [battlesRes, usersRes] = await Promise.all([
        sb.from('battles').select('*').order('created_at', { ascending: false }),
        sb.from('battle_users').select('email, nickname'),
      ])

      if (battlesRes.data) {
        const parsed = battlesRes.data.map(r => parseBattle(r as Record<string, unknown>))
        setAllBattles(parsed)
        setBattles(parsed.filter(battle => battle.status === 'resolved'))
      }
      if (usersRes.data) {
        const map: Record<string, string> = {}
        usersRes.data.forEach((u: { email: string; nickname: string }) => { map[u.email] = u.nickname })
        setNicknames(map)
      }
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
  const participantCount = new Set(allBattles.map(battle => battle.email)).size
  const pendingCount = allBattles.filter(battle => battle.status === 'pending').length
  const allStockCounts = new Map<string, { name: string; count: number }>()
  allBattles.forEach(battle => {
    const current = allStockCounts.get(battle.stock_symbol) ?? { name: battle.stock_name, count: 0 }
    allStockCounts.set(battle.stock_symbol, { ...current, count: current.count + 1 })
  })
  const topStock = Array.from(allStockCounts.entries()).sort((a, b) => b[1].count - a[1].count)[0]

  // 유저별 통계
  const userMap: Record<string, UserStat> = {}
  battles.forEach(b => {
    if (!userMap[b.email]) {
      userMap[b.email] = {
        email: b.email,
        nickname: nicknames[b.email] ?? b.email.split('@')[0],
        total: 0, wins: 0, losses: 0, ties: 0, winRate: 0, avgUserError: 0,
      }
    }
    const u = userMap[b.email]
    u.total++
    if (b.winner === 'USER') u.wins++
    else if (b.winner === 'AI') u.losses++
    else u.ties++
    if (b.user_error != null) u.avgUserError += b.user_error
  })
  const userStats: UserStat[] = Object.values(userMap).map(u => ({
    ...u,
    nickname: nicknames[u.email] ?? u.nickname,
    winRate: u.total > 0 ? Math.round((u.wins / u.total) * 100) : 0,
    avgUserError: u.total > 0 ? parseFloat((u.avgUserError / u.total).toFixed(2)) : 0,
  })).sort((a, b) => b.winRate - a.winRate || b.wins - a.wins)

  // 종목별 통계
  const stockMap: Record<string, StockStat> = {}
  battles.forEach(b => {
    if (!stockMap[b.stock_symbol]) {
      stockMap[b.stock_symbol] = { symbol: b.stock_symbol, name: b.stock_name, market: b.stock_market, total: 0, userWins: 0, aiWins: 0, ties: 0 }
    }
    stockMap[b.stock_symbol].total++
    if (b.winner === 'USER') stockMap[b.stock_symbol].userWins++
    else if (b.winner === 'AI') stockMap[b.stock_symbol].aiWins++
    else stockMap[b.stock_symbol].ties++
  })
  const stockStats = Object.values(stockMap).sort((a, b) => b.total - a.total)

  return (
    <main className="min-h-screen bg-bg">
      <div className="max-w-2xl mx-auto px-6 py-8">

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-black text-white mb-1">{tr('전체 전적과 유저 랭킹', 'Records & User Ranking')}</h1>
          <p className="text-muted text-sm mb-6">{tr('참여 현황부터 인간·AI 승률과 종목별 기록까지 한곳에서 확인하세요.', 'See participation, Human vs AI results, and stock-level records in one place.')}</p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-32">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : allBattles.length === 0 ? (
          <div className="text-center py-32 space-y-4">
            <div className="text-5xl">⚔️</div>
            <p className="text-muted">{tr('아직 종료된 배틀이 없습니다.', 'No battles have settled yet.')}</p>
            <Link href="/battle/new"><Button size="lg">{tr('첫 배틀 시작하기', 'Start the first battle')}</Button></Link>
          </div>
        ) : (
          <div className="space-y-6">

            {/* 전체 참여 현황 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-surface border border-border rounded-xl p-4">
                <div className="text-xs text-muted mb-2">{tr('참여자', 'Participants')}</div>
                <div className="text-3xl font-black text-white font-mono">{participantCount}</div>
                <div className="text-[10px] text-muted mt-1">{tr('고유 이메일 기준', 'Unique accounts')}</div>
              </div>
              <div className="bg-surface border border-border rounded-xl p-4">
                <div className="text-xs text-muted mb-2">{tr('누적 배틀', 'Total battles')}</div>
                <div className="text-3xl font-black text-white font-mono">{allBattles.length}</div>
                <div className="text-[10px] text-muted mt-1">{tr('완료', 'Settled')} {total} · {tr('진행', 'Pending')} {pendingCount}</div>
              </div>
              <div className="bg-surface border border-border rounded-xl p-4 sm:col-span-2">
                <div className="text-xs text-muted mb-2">{tr('가장 많이 참여한 종목', 'Most-battled stock')}</div>
                <div className="flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xl font-black text-white truncate">{topStock?.[1].name ?? '-'}</div>
                    <div className="text-xs text-muted font-mono truncate">{topStock?.[0] ?? ''}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-3xl font-black text-accent font-mono">{topStock?.[1].count ?? 0}</div>
                    <div className="text-[10px] text-muted">{tr('배틀', 'battles')}</div>
                  </div>
                </div>
              </div>
            </div>

            {total > 0 ? (
              <>
                {/* 종합 스코어 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-up/8 border border-up/30 rounded-2xl p-5 text-center">
                    <div className="text-xs text-up font-mono mb-1">🧑 {tr('인간', 'Human')}</div>
                    <div className="text-4xl font-black text-white">{userWinRate}%</div>
                    <div className="text-muted text-xs font-mono mt-1">{userWinsTotal} {tr('승', 'wins')} / {total} {tr('전', 'battles')}</div>
                  </div>
                  <div className="bg-[#A78BFA]/8 border border-[#A78BFA]/30 rounded-2xl p-5 text-center">
                    <div className="text-xs text-[#A78BFA] font-mono mb-1">🤖 {tr('AI 투자 도구', 'AI investing tools')}</div>
                    <div className="text-4xl font-black text-white">{aiWinRate}%</div>
                    <div className="text-muted text-xs font-mono mt-1">{aiWinsTotal} {tr('승', 'wins')} / {total} {tr('전', 'battles')}</div>
                  </div>
                </div>

                {/* 승률 바 */}
                <div className="bg-surface border border-border rounded-2xl p-4">
                  <div className="flex justify-between text-xs font-mono mb-2">
                    <span className="text-up font-bold">{tr('인간', 'Human')} {userWinRate}%</span>
                    {tiesTotal > 0 && <span className="text-muted">{tr('무', 'Draws')} {tiesTotal}</span>}
                    <span className="text-[#A78BFA] font-bold">AI {aiWinRate}%</span>
                  </div>
                  <div className="h-4 bg-border rounded-full overflow-hidden flex">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${userWinRate}%` }} transition={{ duration: 1, ease: 'easeOut' }} className="bg-up" />
                    <motion.div initial={{ width: 0 }} animate={{ width: `${aiWinRate}%` }} transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }} className="bg-[#A78BFA]" />
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-border bg-surface p-5 text-center text-sm text-muted">
                {tr('진행 중인 배틀이 끝나면 인간과 AI의 승률이 표시됩니다.', 'Human and AI win rates appear after the active battles settle.')}
              </div>
            )}

            {/* 탭 */}
            <div className="flex gap-1 bg-surface border border-border rounded-xl p-1">
              {(['users', 'stocks', 'recent'] as const).map(t => (
                <Button
                  key={t}
                  type="button"
                  size="sm"
                  variant={tab === t ? 'primary' : 'ghost'}
                  onClick={() => setTab(t)}
                  className="flex-1"
                >
                  {t === 'users' ? tr('유저 랭킹', 'User ranking') : t === 'stocks' ? tr('종목별', 'By stock') : tr('최근 결과', 'Recent results')}
                </Button>
              ))}
            </div>

            {/* 유저 랭킹 */}
            {tab === 'users' && (
              <div className="space-y-2">
                {userStats.length === 0 ? (
                  <p className="text-muted text-center py-8">{tr('데이터 없음', 'No data')}</p>
                ) : userStats.map((u, i) => (
                  <motion.div
                    key={u.email}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-4 bg-surface border border-border rounded-xl px-4 py-3"
                  >
                    <div className="text-lg font-black font-mono w-8 text-center">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-muted text-sm">{i + 1}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-white truncate">{u.nickname}</div>
                      <div className="text-xs text-muted font-mono">{u.total} {tr('전', 'battles')} · {tr('평균오차', 'avg. error')} {u.avgUserError}%p</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xl font-black font-mono ${u.winRate >= 50 ? 'text-up' : 'text-down'}`}>
                        {u.winRate}%
                      </div>
                      <div className="text-xs text-muted font-mono">{u.wins} {tr('승', 'W')} {u.losses} {tr('패', 'L')}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* 종목별 */}
            {tab === 'stocks' && (
              <div className="space-y-2">
                {stockStats.map((s, i) => (
                  <motion.div
                    key={s.symbol}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-surface border border-border rounded-xl px-4 py-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span>{s.market === 'KR' ? '🇰🇷' : '🇺🇸'}</span>
                          <span className="font-bold text-white">{s.name}</span>
                        </div>
                        <div className="text-xs text-muted font-mono">{s.symbol} · {s.total} {tr('전', 'battles')}</div>
                      </div>
                      <div className="text-right text-xs font-mono">
                        <span className="text-up font-bold">{tr('인간', 'Human')} {s.userWins}</span>
                        <span className="text-muted mx-1">/</span>
                        <span className="text-[#A78BFA] font-bold">AI {s.aiWins}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-border rounded-full overflow-hidden flex">
                      <div className="bg-up" style={{ width: `${s.total > 0 ? (s.userWins / s.total) * 100 : 0}%` }} />
                      <div className="bg-accent/40" style={{ width: `${s.total > 0 ? (s.ties / s.total) * 100 : 0}%` }} />
                      <div className="bg-[#A78BFA]" style={{ width: `${s.total > 0 ? (s.aiWins / s.total) * 100 : 0}%` }} />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* 최근 결과 */}
            {tab === 'recent' && (
              <div className="space-y-2">
                {battles.slice(0, 30).map((b, i) => (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex items-center gap-3 bg-surface border border-border rounded-xl px-4 py-3 text-sm"
                  >
                    <div className={`text-xs font-bold font-mono w-14 flex-shrink-0 ${
                      b.winner === 'USER' ? 'text-up' : b.winner === 'AI' ? 'text-[#A78BFA]' : 'text-muted'
                    }`}>
                      {b.winner === 'USER' ? tr('🧑 승', '🧑 Win') : b.winner === 'AI' ? tr('🤖 승', '🤖 Win') : tr('🤝 무', '🤝 Draw')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-white font-medium">{b.stock_name}</span>
                      <span className="text-muted text-xs font-mono ml-2">{nicknames[b.email] ?? tr('익명', 'Anonymous')}</span>
                    </div>
                    <div className="text-xs font-mono text-muted flex gap-2 flex-shrink-0">
                      <span className={b.user_change_percent != null && b.user_change_percent >= 0 ? 'text-up' : 'text-down'}>
                        {tr('나', 'Me')} {formatPercent(b.user_change_percent ?? 0)}
                      </span>
                      <span className="text-[#A78BFA]">AI {formatPercent(b.ai_change_percent ?? 0)}</span>
                      <span className={b.actual_change_percent != null && b.actual_change_percent >= 0 ? 'text-up' : 'text-down'}>
                        {tr('실', 'Actual')} {b.actual_change_percent != null ? formatPercent(b.actual_change_percent) : '?'}
                      </span>
                    </div>
                    <Link href={`/battle/${b.id}`} className="text-muted hover:text-accent transition-colors text-xs font-mono flex-shrink-0">→</Link>
                  </motion.div>
                ))}
              </div>
            )}

          </div>
        )}
      </div>
    </main>
  )
}
