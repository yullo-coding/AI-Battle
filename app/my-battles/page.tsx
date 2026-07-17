'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'
import { loadSession } from '@/lib/storage'
import type { Battle, UserSession } from '@/lib/types'
import { parseBattle } from '@/lib/types'
import BattleResultCard from '@/components/BattleResultCard'
import EmailAuthModal from '@/components/EmailAuthModal'
import AuthEntryGate from '@/components/AuthEntryGate'
import Button from '@vibe/design-system/components/ui/Button'
import { useLocale } from '@/components/LocaleProvider'

const INITIAL_RESULT_COUNT = 6

export default function MyBattlesPage() {
  const { tr } = useLocale()
  const [session, setSession] = useState<UserSession | null>(null)
  const [sessionReady, setSessionReady] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [battles, setBattles] = useState<Battle[]>([])
  const [loading, setLoading] = useState(true)
  const [visibleResults, setVisibleResults] = useState(INITIAL_RESULT_COUNT)

  useEffect(() => {
    const syncSession = () => {
      const current = loadSession()
      setSession(current)
      setSessionReady(true)
      if (current) {
        loadBattles(current.email)
      } else {
        setBattles([])
        setLoading(false)
      }
    }

    syncSession()
    window.addEventListener('session-change', syncSession)
    return () => window.removeEventListener('session-change', syncSession)
  }, [])

  async function loadBattles(email: string) {
    setLoading(true)
    const sb = getSupabase()
    if (!sb) { setLoading(false); return }

    const { data } = await sb
      .from('battles')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(50)

    if (data) setBattles(data.map(row => parseBattle(row as Record<string, unknown>)))
    setLoading(false)
  }

  function handleAuth(nextSession: UserSession) {
    setSession(nextSession)
    setShowAuth(false)
    loadBattles(nextSession.email)
  }

  const pending = battles.filter(battle => battle.status === 'pending')
  const resolved = battles.filter(battle => battle.status === 'resolved')
  const wins = resolved.filter(battle => battle.winner === 'USER').length
  const losses = resolved.filter(battle => battle.winner === 'AI').length
  const ties = resolved.filter(battle => battle.winner === 'TIE').length
  const winRate = resolved.length > 0 ? Math.round((wins / resolved.length) * 100) : 0
  const withError = resolved.filter(battle => battle.user_error != null)
  const averageError = withError.length > 0
    ? withError.reduce((sum, battle) => sum + (battle.user_error ?? 0), 0) / withError.length
    : null
  const stockCounts = battles.reduce<Map<string, { name: string; count: number }>>((counts, battle) => {
    const current = counts.get(battle.stock_symbol) ?? { name: battle.stock_name, count: 0 }
    counts.set(battle.stock_symbol, { name: current.name, count: current.count + 1 })
    return counts
  }, new Map())
  const favoriteStock = Array.from(stockCounts.entries()).sort((a, b) => b[1].count - a[1].count)[0]
  const shownResults = resolved.slice(0, visibleResults)

  if (!sessionReady) {
    return (
      <main className="min-h-screen bg-bg flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </main>
    )
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-bg">
        {showAuth && <EmailAuthModal onAuth={handleAuth} onClose={() => setShowAuth(false)} />}
        <AuthEntryGate kind="records" onLogin={() => setShowAuth(true)} />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-bg">
      <section className="max-w-5xl mx-auto px-6 py-10 sm:py-14">
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <p className="text-xs font-mono font-bold text-accent mb-2">{tr('내 배틀 대시보드', 'MY BATTLE DASHBOARD')}</p>
            <h1 className="text-3xl sm:text-4xl font-black text-white">
              {session.nickname}<span className="text-accent">{tr(' 님의 전적', "'s record")}</span>
            </h1>
            <p className="mt-2 max-w-xl text-sm sm:text-base text-muted leading-relaxed">
              {tr('진행 중인 승부와 완료된 결과를 확인하고, 내 예측이 AI보다 얼마나 정확했는지 비교해보세요.', 'Track active battles, review results, and compare your prediction accuracy with AI.')}
            </p>
          </div>
          <Link href="/battle/new" className="shrink-0">
            <Button size="lg" pulse className="w-full sm:w-auto">⚔️ {tr('새 배틀 시작', 'Start New Battle')}</Button>
          </Link>
        </motion.header>

        {loading ? (
          <DashboardSkeleton />
        ) : battles.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-10 rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-16 text-center"
          >
            <div className="text-4xl mb-4">⚔️</div>
            <h2 className="text-xl font-black text-white mb-2">{tr('아직 배틀 기록이 없습니다', 'No battle history yet')}</h2>
            <p className="text-sm text-muted mb-6">{tr('AI 도구와 첫 예측 대결을 시작해보세요.', 'Start your first prediction battle against an AI tool.')}</p>
            <Link href="/battle/new"><Button size="lg">{tr('첫 배틀 시작하기', 'Start your first battle')} →</Button></Link>
          </motion.div>
        ) : (
          <div className="mt-9 space-y-12">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="rounded-2xl border border-accent/35 bg-gradient-to-br from-accent/[0.09] via-surface to-surface p-5 sm:p-7"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-6">
                <div>
                  <p className="text-xs font-mono text-muted mb-1">{tr('누적 전적', 'ALL-TIME RECORD')}</p>
                  <h2 className="text-xl sm:text-2xl font-black text-white">{tr('나의 인간 vs AI 성적', 'My Human vs AI performance')}</h2>
                </div>
                <p className="text-xs text-muted">{tr('확정된 결과 기준', 'Based on settled results')}</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="col-span-2 sm:col-span-1 rounded-xl border border-accent/30 bg-bg/45 p-4 sm:p-5">
                  <div className="text-xs text-muted mb-1">{tr('승률', 'Win rate')}</div>
                  <div className="text-4xl sm:text-5xl font-black font-mono text-accent">{winRate}%</div>
                  <div className="text-xs text-muted mt-2">{resolved.length}{tr('전 기준', ' settled')}</div>
                </div>
                <RecordStat label={tr('승리', 'Wins')} value={wins} color="text-up" />
                <RecordStat label={tr('패배', 'Losses')} value={losses} color="text-down" />
                <RecordStat label={tr('진행 중', 'Pending')} value={pending.length} color="text-white" />
              </div>

              {resolved.length > 0 && (
                <div className="mt-5">
                  <div className="flex items-center justify-between text-xs text-muted mb-2">
                    <span>{tr(`${wins}승 ${losses}패${ties ? ` ${ties}무` : ''}`, `${wins}W ${losses}L${ties ? ` ${ties}D` : ''}`)}</span>
                    <span>{winRate}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-border">
                    <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${winRate}%` }} />
                  </div>
                </div>
              )}

              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                <Insight label={tr('누적 배틀', 'Total battles')} value={`${battles.length}${tr('회', '')}`} />
                <Insight label={tr('평균 예측 오차', 'Average error')} value={averageError != null ? `${averageError.toFixed(1)}%p` : '-'} />
                <Insight
                  label={tr('가장 많이 선택한 종목', 'Most selected stock')}
                  value={favoriteStock ? favoriteStock[1].name : '-'}
                  detail={favoriteStock ? `${favoriteStock[0]} · ${favoriteStock[1].count}${tr('회', ' battles')}` : undefined}
                />
              </div>
            </motion.div>

            {pending.length > 0 && (
              <section>
                <SectionHeading
                  eyebrow={tr('진행 중', 'ACTIVE')}
                  title={tr('결과를 기다리는 배틀', 'Battles awaiting results')}
                  description={tr('결과 확인일이 지나면 실제 종가와 예측 오차를 비교할 수 있어요.', 'After the result date, compare predictions against the actual closing price.')}
                  count={pending.length}
                />
                <div className="mt-4 space-y-4">
                  {pending.map(battle => <BattleResultCard key={battle.id} battle={battle} />)}
                </div>
              </section>
            )}

            <section>
              <SectionHeading
                eyebrow={tr('완료', 'SETTLED')}
                title={tr('완료된 배틀 결과', 'Settled battle results')}
                description={tr('실제 등락률과 양측 오차를 비교하면 승패 이유를 바로 확인할 수 있어요.', 'Compare actual movement and both errors to understand every result.')}
                count={resolved.length}
              />

              {resolved.length > 0 ? (
                <>
                  <div className="mt-4 space-y-4">
                    {shownResults.map(battle => <BattleResultCard key={battle.id} battle={battle} />)}
                  </div>
                  {visibleResults < resolved.length && (
                    <div className="mt-5 flex justify-center">
                      <Button variant="secondary" onClick={() => setVisibleResults(count => count + INITIAL_RESULT_COUNT)}>
                        {tr('이전 결과 더 보기', 'Load more results')} ({resolved.length - visibleResults})
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-border bg-surface/50 px-5 py-10 text-center text-sm text-muted">
                  {tr('아직 확정된 배틀 결과가 없습니다.', 'No settled battle results yet.')}
                </div>
              )}
            </section>
          </div>
        )}
      </section>
    </main>
  )
}

function RecordStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg/45 p-4 sm:p-5">
      <div className="text-xs text-muted mb-1">{label}</div>
      <div className={`text-3xl sm:text-4xl font-black font-mono ${color}`}>{value}</div>
    </div>
  )
}

function Insight({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2 px-4 py-3">
      <div className="text-[11px] text-muted mb-1">{label}</div>
      <div className="font-black text-white truncate">{value}</div>
      {detail && <div className="mt-1 text-[10px] font-mono text-muted truncate">{detail}</div>}
    </div>
  )
}

function SectionHeading({ eyebrow, title, description, count }: { eyebrow: string; title: string; description: string; count: number }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-mono font-bold text-accent mb-1">{eyebrow}</p>
        <h2 className="text-xl sm:text-2xl font-black text-white">{title}</h2>
        <p className="mt-1.5 text-sm text-muted">{description}</p>
      </div>
      <div className="w-fit rounded-full border border-border bg-surface px-3 py-1 text-xs font-bold text-white">
        {count}
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="mt-9 space-y-5 animate-pulse">
      <div className="h-72 rounded-2xl border border-border bg-surface" />
      <div className="h-10 w-48 rounded-lg bg-surface" />
      <div className="h-52 rounded-2xl border border-border bg-surface" />
    </div>
  )
}
