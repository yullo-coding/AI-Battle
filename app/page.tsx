'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'
import { loadSession, clearSession } from '@/lib/storage'
import { parseBattle } from '@/lib/types'
import type { Battle, UserSession } from '@/lib/types'
import HeroSection from '@/components/HeroSection'
import BattleResultCard from '@/components/BattleResultCard'
import Button from '@vibe/design-system/components/ui/Button'
import { useLocale } from '@/components/LocaleProvider'

interface GlobalStats {
  humanWins: number
  aiWins: number
  ties: number
  participants: number
  totalBattles: number
  topStockName: string
  topStockSymbol: string
  topStockCount: number
}

interface UserBattleStats {
  wins: number
  losses: number
  ties: number
  resolved: number
  pending: number
}

const EMPTY_USER_STATS: UserBattleStats = { wins: 0, losses: 0, ties: 0, resolved: 0, pending: 0 }

function DashboardStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg/45 p-4 sm:p-5">
      <div className="text-xs text-muted mb-1">{label}</div>
      <div className={`text-3xl sm:text-4xl font-black font-mono ${color}`}>{value}</div>
    </div>
  )
}

export default function HomePage() {
  const { tr } = useLocale()
  const [session, setSession] = useState<UserSession | null>(null)
  const [battles, setBattles] = useState<Battle[]>([])
  const [userStats, setUserStats] = useState<UserBattleStats>(EMPTY_USER_STATS)
  const [loading, setLoading] = useState(false)
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null)

  useEffect(() => {
    const s = loadSession()
    setSession(s)
    if (s) loadRecentBattles(s.email)
    loadGlobalStats()
  }, [])

  async function loadRecentBattles(email: string) {
    setLoading(true)
    const sb = getSupabase()
    if (!sb) { setLoading(false); return }
    const [recentResult, statsResult] = await Promise.all([
      sb
        .from('battles')
        .select('*')
        .eq('email', email)
        .order('created_at', { ascending: false })
        .limit(3),
      sb
        .from('battles')
        .select('winner,status')
        .eq('email', email),
    ])

    if (recentResult.data) {
      setBattles(recentResult.data.map(r => parseBattle(r as Record<string, unknown>)))
    }
    if (statsResult.data) {
      const settled = statsResult.data.filter(row => row.status === 'resolved')
      setUserStats({
        wins: settled.filter(row => row.winner === 'USER').length,
        losses: settled.filter(row => row.winner === 'AI').length,
        ties: settled.filter(row => row.winner === 'TIE').length,
        resolved: settled.length,
        pending: statsResult.data.filter(row => row.status === 'pending').length,
      })
    }
    setLoading(false)
  }

  async function loadGlobalStats() {
    const sb = getSupabase()
    if (!sb) return
    const { data } = await sb
      .from('battles')
      .select('email,winner,status,stock_symbol,stock_name')
    if (!data) return

    const resolvedRows = data.filter(row => row.status === 'resolved')
    const stockCounts = new Map<string, { name: string; count: number }>()
    data.forEach(row => {
      const current = stockCounts.get(row.stock_symbol) ?? { name: row.stock_name, count: 0 }
      stockCounts.set(row.stock_symbol, { ...current, count: current.count + 1 })
    })
    const topStock = Array.from(stockCounts.entries()).sort((a, b) => b[1].count - a[1].count)[0]

    setGlobalStats({
      humanWins: resolvedRows.filter(row => row.winner === 'USER').length,
      aiWins: resolvedRows.filter(row => row.winner === 'AI').length,
      ties: resolvedRows.filter(row => row.winner === 'TIE').length,
      participants: new Set(data.map(row => row.email)).size,
      totalBattles: data.length,
      topStockName: topStock?.[1].name ?? '-',
      topStockSymbol: topStock?.[0] ?? '',
      topStockCount: topStock?.[1].count ?? 0,
    })
  }

  function handleLogout() {
    clearSession()
    setSession(null)
    setBattles([])
    setUserStats(EMPTY_USER_STATS)
  }

  const winRate = userStats.resolved > 0 ? Math.round((userStats.wins / userStats.resolved) * 100) : 0

  return (
    <main className="relative min-h-screen bg-bg">
      {/* ── 로그인 전: 풀 랜딩 ── */}
      {!session && (
        <>
          <HeroSection session={null} onLogout={handleLogout} />

          {/* 두 가지 참여 경로 */}
          <section className="max-w-5xl mx-auto px-6 pt-20">
            <div className="text-center mb-8">
              <div className="text-xs font-mono text-accent mb-2">{tr('함께 만드는 AI 투자 도구 광장', 'A community-built AI investing hub')}</div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">{tr('투자자도, 도구 제작자도 참여할 수 있어요', 'Join as an investor or a tool builder')}</h2>
              <p className="text-sm text-muted mt-3 max-w-2xl mx-auto leading-relaxed">
                {tr('투자자는 여러 AI를 직접 비교하고, 제작자는 리뷰와 실제 배틀 성과로 도구를 검증받습니다.', 'Investors compare AIs directly. Builders earn reviews and prove their tools through real battle results.')}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="rounded-2xl border border-human/35 bg-human/[0.05] p-6"
              >
                <div className="inline-flex rounded-full border border-human/30 bg-human/10 px-3 py-1 text-xs font-bold text-human mb-5">
                  {tr('투자자', 'For investors')}
                </div>
                <h3 className="text-xl font-black text-white mb-2">{tr('나와 AI, 누가 더 정확할까요?', 'Can you beat the AI?')}</h3>
                <p className="text-sm text-muted leading-relaxed mb-5">
                  {tr('원하는 AI 도구와 종목을 고르고 같은 조건에서 예측 정확도를 겨뤄보세요.', 'Choose an AI tool and stock, then compete under the exact same conditions.')}
                </p>
                <ul className="space-y-2 text-sm text-white/85 mb-6">
                  <li className="flex gap-2"><span className="text-human">01</span>{tr('한국·미국 종목 검색과 핵심 지표 확인', 'Search KR & US stocks and review key signals')}</li>
                  <li className="flex gap-2"><span className="text-human">02</span>{tr('사람과 AI의 예측 오차를 실제 종가로 비교', 'Compare human and AI errors against the real close')}</li>
                  <li className="flex gap-2"><span className="text-human">03</span>{tr('사용한 도구에 좋아요와 리뷰 남기기', 'Like and review the tool you used')}</li>
                </ul>
                <Link href="/battle/new" className="block">
                  <Button size="lg" variant="human" className="w-full">
                    {tr('AI와 배틀 시작', 'Start an AI Battle')} →
                  </Button>
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.08 }}
                className="rounded-2xl border border-[#A78BFA]/40 bg-[#A78BFA]/[0.06] p-6"
              >
                <div className="inline-flex rounded-full border border-[#A78BFA]/35 bg-[#A78BFA]/10 px-3 py-1 text-xs font-bold text-[#C4B5FD] mb-5">
                  {tr('AI 도구 제작자', 'For AI builders')}
                </div>
                <h3 className="text-xl font-black text-white mb-2">{tr('만든 도구를 실제 시장에서 증명하세요', 'Prove your tool in the real market')}</h3>
                <p className="text-sm text-muted leading-relaxed mb-5">
                  {tr('링크만으로 먼저 소개하고, 예측 API를 연결하면 유저가 서비스 안에서 바로 배틀할 수 있어요.', 'List it with a link, then connect a prediction API so users can battle it without leaving the site.')}
                </p>
                <ul className="space-y-2 text-sm text-white/85 mb-6">
                  <li className="flex gap-2"><span className="text-[#C4B5FD]">01</span>{tr('도구 소개 페이지와 제작자 프로필 공개', 'Publish a tool page and builder profile')}</li>
                  <li className="flex gap-2"><span className="text-[#C4B5FD]">02</span>{tr('좋아요·리뷰로 실제 사용자 피드백 수집', 'Collect real feedback through likes and reviews')}</li>
                  <li className="flex gap-2"><span className="text-[#C4B5FD]">03</span>{tr('승률과 평균 오차를 성과 데이터로 축적', 'Build a track record with win rate and average error')}</li>
                </ul>
                <Link href="/tools/new" className="block">
                  <Button size="lg" variant="ai" className="w-full">{tr('내 AI 도구 등록', 'Submit My AI Tool')} →</Button>
                </Link>
              </motion.div>
            </div>
          </section>

          {/* HOW IT WORKS */}
          <section className="max-w-5xl mx-auto px-6 py-20 space-y-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="text-center mb-8">
                <div className="text-xs font-mono text-muted mb-2">{tr('사용 방법', 'How it works')}</div>
                <h2 className="text-2xl font-black text-white">{tr('6단계로 AI와 대결', 'Battle an AI in 6 steps')}</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { step: '01', icon: '🤖', label: tr('AI 서비스 선택', 'Choose AI service'), desc: tr('대결할 투자 분석 도구 선택', 'Choose an investing tool') },
                  { step: '02', icon: '📈', label: tr('종목 선택', 'Choose stock'), desc: tr('한국·미국 종목 검색과 선택', 'Search and choose KR & US stocks') },
                  { step: '03', icon: '📅', label: tr('결과일 선택', 'Choose result date'), desc: tr('다음 10거래일 중 선택', 'Pick from the next 10 trading days') },
                  { step: '04', icon: '🔍', label: tr('지표 분석', 'Review analysis'), desc: tr('RSI·MACD·볼린저 대시보드', 'RSI, MACD & Bollinger dashboard') },
                  { step: '05', icon: '🎯', label: tr('등락률 예측', 'Enter prediction'), desc: tr('%와 예상 금액을 직접 입력', 'Enter a percent and target price') },
                  { step: '06', icon: '🏆', label: tr('승부 판정', 'Settle result'), desc: tr('더 정확한 예측이 승리!', 'The closer prediction wins') },
                ].map((item, i) => (
                  <motion.div
                    key={item.step}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.07 }}
                    className="relative p-4 rounded-2xl border bg-surface border-border"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">{item.icon}</span>
                      <span className="text-xs font-black font-mono text-accent/60">{item.step}</span>
                    </div>
                    <div className="font-black text-white text-sm mb-1">{item.label}</div>
                    <div className="text-muted text-xs leading-relaxed">{item.desc}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* 전체 인간 vs AI 통계 */}
            {globalStats && globalStats.totalBattles > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="border border-border rounded-2xl p-5 sm:p-6 bg-surface"
              >
                <div className="flex items-center justify-between gap-3 mb-5">
                  <div>
                    <div className="text-xs font-mono text-accent mb-1">{tr('전체 인간 vs AI 전적', 'Overall Human vs AI Record')}</div>
                    <div className="text-lg font-black text-white">{tr('누가 더 정확했을까요?', 'Who has been more accurate?')}</div>
                  </div>
                  <Link href="/leaderboard" className="text-xs text-muted hover:text-accent transition-colors shrink-0">
                    {tr('전적·랭킹 상세', 'Records & ranking')} →
                  </Link>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-5">
                  <div className="rounded-xl border border-border bg-surface-2 p-3 text-center">
                    <div className="text-xl font-black text-white font-mono">{globalStats.participants}</div>
                    <div className="text-[10px] text-muted mt-1">{tr('참여자', 'Participants')}</div>
                  </div>
                  <div className="rounded-xl border border-border bg-surface-2 p-3 text-center">
                    <div className="text-xl font-black text-white font-mono">{globalStats.totalBattles}</div>
                    <div className="text-[10px] text-muted mt-1">{tr('누적 배틀', 'Total battles')}</div>
                  </div>
                  <div className="rounded-xl border border-border bg-surface-2 p-3 text-center min-w-0">
                    <div className="text-sm font-black text-white truncate">{globalStats.topStockName}</div>
                    <div className="text-[10px] text-muted mt-1 truncate">{globalStats.topStockSymbol} · {globalStats.topStockCount}{tr('회', '')}</div>
                  </div>
                </div>

                {globalStats.humanWins + globalStats.aiWins > 0 ? (
                  <>
                    <div className="flex justify-between text-sm font-mono mb-2">
                      <span className="text-human font-bold">{tr('인간', 'Human')} {globalStats.humanWins}{tr('승', ' wins')}</span>
                      {globalStats.ties > 0 && <span className="text-muted">{tr('무승부', 'Draws')} {globalStats.ties}</span>}
                      <span className="text-[#A78BFA] font-bold">AI {globalStats.aiWins}{tr('승', ' wins')}</span>
                    </div>
                    <div className="h-2 bg-border rounded-full overflow-hidden flex">
                      <div
                        className="bg-human h-full rounded-full transition-all"
                        style={{ width: `${(globalStats.humanWins / (globalStats.humanWins + globalStats.aiWins)) * 100}%` }}
                      />
                      <div className="bg-[#A78BFA] h-full flex-1" />
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-muted text-center">{tr('진행 중인 배틀이 끝나면 승률이 표시됩니다.', 'Win rates appear after active battles settle.')}</div>
                )}
              </motion.div>
            )}

          </section>
        </>
      )}

      {/* ── 로그인 후: 대시보드 ── */}
      {session && (
        <section className="max-w-4xl mx-auto px-6 py-10 sm:py-14 space-y-8 sm:space-y-10">
          <motion.header
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"
          >
            <div>
              <div className="text-accent text-xs font-mono font-bold mb-2">{tr('내 배틀 대시보드', 'MY BATTLE DASHBOARD')}</div>
              <h1 className="text-3xl sm:text-4xl font-black text-white">
                {session.nickname}<span className="text-accent">{tr(' 님의 기록', "'s record")}</span>
              </h1>
              <p className="mt-2 text-sm sm:text-base text-muted">
                {tr('전적을 확인하고 다음 AI 투자 배틀에 도전해보세요.', 'Review your record and take on the next AI investing battle.')}
              </p>
            </div>
            <Link href="/battle/new" className="shrink-0">
              <Button size="lg" pulse className="w-full sm:w-auto">⚔️ {tr('새 배틀 시작', 'Start New Battle')}</Button>
            </Link>
          </motion.header>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl border border-accent/35 bg-gradient-to-br from-accent/[0.09] via-surface to-surface p-5 sm:p-7"
          >
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <div className="text-xs text-muted font-mono mb-1">{tr('누적 전적', 'ALL-TIME RECORD')}</div>
                <h2 className="text-xl font-black text-white">{tr('나의 인간 vs AI 성적', 'My Human vs AI record')}</h2>
              </div>
              <Link href="/my-battles" className="text-xs sm:text-sm font-bold text-accent hover:text-white transition-colors">
                {tr('전체 전적', 'Full record')} →
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="col-span-2 sm:col-span-1 rounded-xl border border-accent/30 bg-bg/45 p-4 sm:p-5">
                <div className="text-xs text-muted mb-1">{tr('승률', 'Win rate')}</div>
                <div className="text-4xl sm:text-5xl font-black font-mono text-accent">{winRate}%</div>
                <div className="text-xs text-muted mt-2">{userStats.resolved}{tr('전 기준', ' settled')}</div>
              </div>
              <DashboardStat label={tr('승리', 'Wins')} value={userStats.wins} color="text-up" />
              <DashboardStat label={tr('패배', 'Losses')} value={userStats.losses} color="text-down" />
              <DashboardStat label={tr('진행 중', 'Pending')} value={userStats.pending} color="text-white" />
            </div>

            {userStats.resolved > 0 ? (
              <div className="mt-5">
                <div className="flex items-center justify-between text-xs text-muted mb-2">
                  <span>{tr(`${userStats.wins}승 ${userStats.losses}패${userStats.ties ? ` ${userStats.ties}무` : ''}`, `${userStats.wins}W ${userStats.losses}L${userStats.ties ? ` ${userStats.ties}D` : ''}`)}</span>
                  <span>{tr('정확도 대결 결과', 'Prediction battle results')}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-border">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${winRate}%` }} />
                </div>
              </div>
            ) : (
              <p className="mt-5 text-sm text-muted">{tr('첫 배틀 결과가 확정되면 승률과 전적이 여기에 표시됩니다.', 'Your win rate and record will appear here after the first battle settles.')}</p>
            )}
          </motion.div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/tools" className="group flex items-center gap-4 rounded-2xl border border-border bg-surface p-5 hover:border-human/65 hover:bg-human/[0.05] transition-colors">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-human/10 text-xl">🧰</div>
              <div className="min-w-0">
                <div className="text-white font-black">{tr('대결할 AI 도구 찾기', 'Find an AI to battle')}</div>
                <div className="text-sm text-muted mt-1">{tr('평점과 실제 배틀 성과 비교', 'Compare ratings and real battle performance')}</div>
              </div>
              <span className="ml-auto text-human group-hover:translate-x-1 transition-transform">→</span>
            </Link>
            <Link href="/tools/new" className="group flex items-center gap-4 rounded-2xl border border-border bg-surface p-5 hover:border-[#A78BFA]/65 hover:bg-[#A78BFA]/[0.05] transition-colors">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#A78BFA]/10 text-xl">🚀</div>
              <div className="min-w-0">
                <div className="text-white font-black">{tr('내 AI 도구 등록하기', 'Submit my AI tool')}</div>
                <div className="text-sm text-muted mt-1">{tr('소개 링크 등록 · 배틀 API 선택 연결', 'List a link · optionally connect a Battle API')}</div>
              </div>
              <span className="ml-auto text-[#A78BFA] group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>

          <div className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-xs font-mono text-muted mb-1">{tr('최근 기록', 'RECENT RECORD')}</div>
                <h2 className="text-xl sm:text-2xl font-black text-white">{tr('최근 배틀 결과', 'Recent battle results')}</h2>
              </div>
              <Link href="/my-battles" className="text-sm font-bold text-accent hover:text-white transition-colors">
                {tr('전체 보기', 'View all')} →
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="h-48 bg-surface border border-border rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : battles.length > 0 ? (
              battles.map(b => <BattleResultCard key={b.id} battle={b} />)
            ) : (
              <div className="text-center py-12 border border-dashed border-border rounded-2xl bg-surface/50">
                <div className="text-2xl mb-3">⚔️</div>
                <div className="text-white font-bold mb-1">{tr('아직 배틀 기록이 없습니다', 'No battle history yet')}</div>
                <div className="text-muted text-sm">{tr('첫 AI 투자 배틀을 시작해보세요.', 'Start your first AI investing battle.')}</div>
              </div>
            )}
          </div>
        </section>
      )}

      <footer className="border-t border-border py-8 text-center text-muted text-xs font-mono">
        <div className="text-accent mb-1">AI_BATTLE v2.0.0</div>
        <div>{tr('무료 규칙 기반 분석기 × 공개 시장 데이터', 'Free rule-based analysis × public market data')}</div>
      </footer>
    </main>
  )
}
