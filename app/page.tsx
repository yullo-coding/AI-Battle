'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'
import { loadSession, saveSession, clearSession } from '@/lib/storage'
import { parseBattle } from '@/lib/types'
import type { Battle, UserSession } from '@/lib/types'
import HeroSection from '@/components/HeroSection'
import BattleResultCard from '@/components/BattleResultCard'
import EmailAuthModal from '@/components/EmailAuthModal'
import Button from '@vibe/design-system/components/ui/Button'
import { useLocale } from '@/components/LocaleProvider'

export default function HomePage() {
  const { tr } = useLocale()
  const [session, setSession] = useState<UserSession | null>(null)
  const [showAuth, setShowAuth] = useState(false)
  const [battles, setBattles] = useState<Battle[]>([])
  const [loading, setLoading] = useState(false)
  const [globalStats, setGlobalStats] = useState<{ humanWins: number; aiWins: number } | null>(null)

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
    const { data } = await sb
      .from('battles')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(3)
    if (data) setBattles(data.map(r => parseBattle(r as Record<string, unknown>)))
    setLoading(false)
  }

  async function loadGlobalStats() {
    const sb = getSupabase()
    if (!sb) return
    const { data } = await sb
      .from('battles')
      .select('winner')
      .eq('status', 'resolved')
    if (!data) return
    setGlobalStats({
      humanWins: data.filter(r => r.winner === 'USER').length,
      aiWins: data.filter(r => r.winner === 'AI').length,
    })
  }

  function handleAuth(s: UserSession) {
    setSession(s)
    setShowAuth(false)
    saveSession(s)
    loadRecentBattles(s.email)
  }

  function handleLogout() {
    clearSession()
    setSession(null)
    setBattles([])
  }

  const resolved = battles.filter(b => b.status === 'resolved')
  const wins = resolved.filter(b => b.winner === 'USER').length
  const losses = resolved.filter(b => b.winner === 'AI').length

  return (
    <main className="relative min-h-screen bg-bg">
      {showAuth && <EmailAuthModal onAuth={handleAuth} onClose={() => setShowAuth(false)} />}

      {/* ── 로그인 전: 풀 랜딩 ── */}
      {!session && (
        <>
          <HeroSection session={null} onAuthClick={() => setShowAuth(true)} onLogout={handleLogout} />

          {/* HOW IT WORKS */}
          <section className="max-w-lg mx-auto px-6 py-16 space-y-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="text-center mb-8">
                <div className="text-xs font-mono text-muted mb-2">{tr('사용 방법', 'How it works')}</div>
                <h2 className="text-2xl font-black text-white">{tr('6단계로 AI와 대결', 'Battle an AI in 6 steps')}</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { step: '01', icon: '🤖', label: tr('AI 서비스 선택', 'Choose AI service'), desc: tr('대결할 투자 분석 도구 선택', 'Choose an investing tool') },
                  { step: '02', icon: '📈', label: tr('종목 선택', 'Choose stock'), desc: tr('한국·미국 인기 종목 10개', '10 popular KR & US stocks') },
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
            {globalStats && (globalStats.humanWins + globalStats.aiWins) > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="border border-border rounded-xl p-5 bg-surface"
              >
                <div className="text-xs font-mono text-muted mb-3 text-center">{tr('전체 인간 vs AI 전적', 'Overall Human vs AI Record')}</div>
                <div className="flex justify-between text-sm font-mono mb-2">
                  <span className="text-human font-bold">{tr('인간', 'Human')} {globalStats.humanWins}{tr('승', ' wins')}</span>
                  <span className="text-[#A78BFA] font-bold">AI {globalStats.aiWins}{tr('승', ' wins')}</span>
                </div>
                <div className="h-2 bg-border rounded-full overflow-hidden flex">
                  <div
                    className="bg-human h-full rounded-full transition-all"
                    style={{ width: `${(globalStats.humanWins / (globalStats.humanWins + globalStats.aiWins)) * 100}%` }}
                  />
                  <div className="bg-[#A78BFA] h-full flex-1" />
                </div>
              </motion.div>
            )}

            <div className="text-center">
              <motion.div whileTap={{ scale: 0.97 }} className="inline-block">
                <Button size="lg" pulse onClick={() => setShowAuth(true)}>⚔️ {tr('지금 참전하기', 'Join the Battle')}</Button>
              </motion.div>
            </div>

            <Link href="/tools" className="block p-5 rounded-2xl border border-border bg-surface hover:border-accent/60 transition-colors group">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-accent text-xs font-mono mb-1">{tr('AI 투자 도구 광장', 'AI Investing Tool Hub')}</div>
                  <div className="text-white font-black text-lg mb-1">{tr('도구를 올리고, 써보고, 평가하세요', 'Submit, use, and review tools')}</div>
                  <div className="text-muted text-sm">{tr('다른 제작자의 도구를 발견하고 실력으로 검증합니다.', 'Discover builder-made tools and test them in battle.')}</div>
                </div>
                <span className="text-2xl text-muted group-hover:text-accent transition-colors">→</span>
              </div>
            </Link>
          </section>
        </>
      )}

      {/* ── 로그인 후: 대시보드 ── */}
      {session && (
        <section className="max-w-lg mx-auto px-6 py-10 space-y-8">

          {/* 인사 + 통계 */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="text-muted text-sm font-mono mb-1">{tr('안녕하세요,', 'Welcome,')}</div>
            <h1 className="text-2xl font-black text-white mb-4">{session.nickname}<span className="text-accent">{tr(' 님', '')}</span></h1>

            {resolved.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-2">
                <div className="bg-surface border border-border rounded-xl p-3 text-center">
                  <div className="text-2xl font-black text-up font-mono">{wins}</div>
                  <div className="text-xs text-muted mt-0.5">{tr('승', 'Wins')}</div>
                </div>
                <div className="bg-surface border border-border rounded-xl p-3 text-center">
                  <div className="text-2xl font-black text-down font-mono">{losses}</div>
                  <div className="text-xs text-muted mt-0.5">{tr('패', 'Losses')}</div>
                </div>
                <div className="bg-surface border border-border rounded-xl p-3 text-center">
                  <div className="text-2xl font-black text-accent font-mono">
                    {resolved.length > 0 ? Math.round((wins / resolved.length) * 100) : 0}%
                  </div>
                  <div className="text-xs text-muted mt-0.5">{tr('승률', 'Win rate')}</div>
                </div>
              </div>
            )}
          </motion.div>

          {/* 새 배틀 CTA */}
          <Link href="/battle/new" className="block">
            <Button size="lg" pulse className="w-full">⚔️ {tr('새 배틀 시작', 'Start New Battle')}</Button>
          </Link>

          <div className="grid grid-cols-2 gap-3">
            <Link href="/tools" className="p-4 rounded-xl border border-border bg-surface hover:border-accent/60 transition-colors">
              <div className="text-xl mb-2">🧰</div>
              <div className="text-white font-bold text-sm">{tr('AI 도구 찾기', 'Find AI Tools')}</div>
              <div className="text-xs text-muted mt-1">{tr('리뷰·평점·배틀', 'Reviews · ratings · battles')}</div>
            </Link>
            <Link href="/tools/new" className="p-4 rounded-xl border border-border bg-surface hover:border-accent/60 transition-colors">
              <div className="text-xl mb-2">🚀</div>
              <div className="text-white font-bold text-sm">{tr('내 도구 등록', 'Submit My Tool')}</div>
              <div className="text-xs text-muted mt-1">{tr('링크 또는 배틀 API 연결', 'Link or Battle API')}</div>
            </Link>
          </div>

          {/* 최근 배틀 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-muted">{tr('최근 배틀', 'Recent battles')}</span>
              <Link href="/my-battles" className="text-xs text-muted font-mono hover:text-accent transition-colors">
                {tr('전체 보기', 'View all')} →
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="h-28 bg-surface border border-border rounded-xl animate-pulse" />
                ))}
              </div>
            ) : battles.length > 0 ? (
              battles.map(b => <BattleResultCard key={b.id} battle={b} />)
            ) : (
              <div className="text-center py-10 border border-border rounded-xl text-muted text-sm">
                {tr('아직 배틀 기록이 없습니다.', 'No battle history yet.')}
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
