'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'
import { loadSession, clearSession, restoreAuthenticatedSession } from '@/lib/storage'
import type { UserSession } from '@/lib/types'
import HeroSection from '@/components/HeroSection'
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

export default function HomePage() {
  const { tr } = useLocale()
  const [session, setSession] = useState<UserSession | null>(null)
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null)

  useEffect(() => {
    const syncSession = () => setSession(loadSession())
    syncSession()
    void restoreAuthenticatedSession().then(setSession)
    loadGlobalStats()
    window.addEventListener('session-change', syncSession)
    window.addEventListener('storage', syncSession)
    return () => {
      window.removeEventListener('session-change', syncSession)
      window.removeEventListener('storage', syncSession)
    }
  }, [])

  async function loadGlobalStats() {
    const sb = getSupabase()
    if (!sb) return
    const { data } = await sb
      .from('public_battles')
      .select('player_id,winner,status,stock_symbol,stock_name')
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
      participants: new Set(data.map(row => row.player_id)).size,
      totalBattles: data.length,
      topStockName: topStock?.[1].name ?? '-',
      topStockSymbol: topStock?.[0] ?? '',
      topStockCount: topStock?.[1].count ?? 0,
    })
  }

  async function handleLogout() {
    await clearSession()
    setSession(null)
  }

  return (
    <main className="relative min-h-screen bg-bg">
      {/* 로그인 여부와 관계없이 홈은 서비스 소개 랜딩으로 유지 */}
      <>
          <HeroSection session={session} onLogout={handleLogout} />

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

      <footer className="border-t border-border py-8 text-center text-muted text-xs font-mono">
        <div className="text-accent mb-1">AI_BATTLE v2.0.0</div>
        <div>{tr('무료 규칙 기반 분석기 × 공개 시장 데이터', 'Free rule-based analysis × public market data')}</div>
      </footer>
    </main>
  )
}
