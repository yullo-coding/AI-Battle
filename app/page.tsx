'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'
import { loadSession, saveSession } from '@/lib/storage'
import type { Battle, UserSession } from '@/lib/types'
import HeroSection from '@/components/HeroSection'
import BattleResultCard from '@/components/BattleResultCard'
import PhoneAuthModal from '@/components/PhoneAuthModal'

export default function HomePage() {
  const [session, setSession] = useState<UserSession | null>(null)
  const [showAuth, setShowAuth] = useState(false)
  const [battles, setBattles] = useState<Battle[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const s = loadSession()
    setSession(s)
    if (s) loadRecentBattles(s.phone)
  }, [])

  async function loadRecentBattles(phone: string) {
    setLoading(true)
    const sb = getSupabase()
    if (!sb) { setLoading(false); return }

    const { data } = await sb
      .from('battles')
      .select('*')
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(3)

    if (data) setBattles(data as Battle[])
    setLoading(false)
  }

  function handleAuth(s: UserSession) {
    setSession(s)
    setShowAuth(false)
    saveSession(s)
    loadRecentBattles(s.phone)
  }

  return (
    <main className="relative min-h-screen bg-bg">
      {showAuth && <PhoneAuthModal onAuth={handleAuth} />}

      <HeroSection session={session} onAuthClick={() => setShowAuth(true)} />

      {/* CTA section */}
      <section className="max-w-lg mx-auto px-6 py-16 space-y-12">

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="space-y-3"
        >
          <div className="tag text-muted mb-4">// HOW_IT_WORKS</div>
          {[
            { step: '01', label: '종목 선택', desc: '삼성전자 · NVIDIA · Alphabet 중 선택' },
            { step: '02', label: '날짜 선택', desc: '내일~7일 후 중 결과 확인 날짜 선택' },
            { step: '03', label: '지표 확인', desc: 'RSI · MACD · 볼린저 · 애널리스트 분석' },
            { step: '04', label: '% 예측', desc: '-15% ~ +15% 슬라이더로 등락률 예측' },
            { step: '05', label: 'AI 대결', desc: 'Claude Sonnet 4.6이 자체 예측 생성' },
            { step: '06', label: '승부 판정', desc: '실제 종가에 더 가깝게 맞춘 쪽이 승리!' },
          ].map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="flex items-start gap-4 p-4 bg-surface border border-border rounded-xl"
            >
              <div className="text-accent font-mono text-xs font-bold w-6 flex-shrink-0 mt-0.5">{item.step}</div>
              <div>
                <div className="font-bold text-white text-sm">{item.label}</div>
                <div className="text-muted text-xs mt-0.5">{item.desc}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Recent battles (if logged in) */}
        {session && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="tag text-accent">// RECENT_BATTLES</div>
              <Link href="/my-battles" className="text-xs text-muted font-mono hover:text-accent transition-colors">
                전체 보기 →
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="h-32 bg-surface border border-border rounded-xl animate-pulse" />
                ))}
              </div>
            ) : battles.length > 0 ? (
              <div className="space-y-4">
                {battles.map(b => (
                  <BattleResultCard key={b.id} battle={b} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border border-border rounded-xl text-muted text-sm">
                아직 참여한 배틀이 없습니다. 첫 배틀을 시작해보세요!
              </div>
            )}
          </motion.div>
        )}

        {/* Leaderboard link */}
        <div className="text-center">
          <Link
            href="/leaderboard"
            className="inline-flex items-center gap-2 px-6 py-3 border border-border text-muted rounded-lg hover:border-accent hover:text-accent transition-colors font-mono text-sm"
          >
            🏆 인간 vs AI 전체 전적
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-muted text-xs font-mono">
        <div className="text-accent mb-1">AI_BATTLE v2.0.0</div>
        <div>Powered by Claude Sonnet 4.6 × Yahoo Finance</div>
      </footer>
    </main>
  )
}
