'use client'

import { useState, useEffect } from 'react'
import { getSupabase } from '@/lib/supabase'
import { loadSession } from '@/lib/storage'
import { loadLocalPrediction } from '@/lib/storage'
import type { BattleRound, UserSession } from '@/lib/types'
import HeroSection from '@/components/HeroSection'
import BattleCard from '@/components/BattleCard'
import PhoneAuthModal from '@/components/PhoneAuthModal'

export default function HomePage() {
  const [session, setSession] = useState<UserSession | null>(null)
  const [rounds, setRounds] = useState<BattleRound[]>([])
  const [prices, setPrices] = useState<Record<string, { price: number; changePercent: number }>>({})
  const [showAuth, setShowAuth] = useState(false)
  const [loading, setLoading] = useState(true)

  // Load session on mount
  useEffect(() => {
    setSession(loadSession())
  }, [])

  // Fetch active battle rounds
  useEffect(() => {
    async function fetchRounds() {
      const sb = getSupabase()
      if (!sb) return

      const { data, error } = await sb
        .from('battle_rounds')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      if (!error && data) setRounds(data as BattleRound[])
      setLoading(false)
    }
    fetchRounds()
  }, [])

  // Fetch current prices
  useEffect(() => {
    if (rounds.length === 0) return
    async function fetchPrices() {
      try {
        const res = await fetch('/api/stocks')
        if (!res.ok) return
        const quotes = await res.json() as Array<{ symbol: string; price: number; changePercent: number }>
        const map: Record<string, { price: number; changePercent: number }> = {}
        quotes.forEach(q => { map[q.symbol] = { price: q.price, changePercent: q.changePercent } })
        setPrices(map)
      } catch { /* ignore */ }
    }
    fetchPrices()
  }, [rounds])

  function handleAuth(s: UserSession) {
    setSession(s)
    setShowAuth(false)
  }

  const activeRounds = rounds.filter(r => r.status === 'active')
  const endedRounds = rounds.filter(r => r.status === 'ended')

  return (
    <main className="relative min-h-screen bg-bg">
      {showAuth && <PhoneAuthModal onAuth={handleAuth} />}

      <HeroSection session={session} onAuthClick={() => setShowAuth(true)} />

      {/* Battle list */}
      <section id="battles" className="max-w-4xl mx-auto px-6 py-16">
        {/* Active battles */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="tag text-danger mb-1">// LIVE_BATTLES</div>
              <h2 className="text-2xl font-bold text-white">진행 중인 배틀</h2>
            </div>
            {!session && (
              <button
                onClick={() => setShowAuth(true)}
                className="px-4 py-2 border border-accent text-accent rounded-lg text-sm font-mono hover:bg-accent/10 transition-colors"
              >
                참전하기
              </button>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1,2,3,4].map(i => (
                <div key={i} className="bg-surface border border-border rounded-xl p-6 h-48 animate-pulse" />
              ))}
            </div>
          ) : activeRounds.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeRounds.map((round, i) => (
                <BattleCard
                  key={round.id}
                  round={round}
                  currentPrice={prices[round.stock_symbol]?.price}
                  changePercent={prices[round.stock_symbol]?.changePercent}
                  userPrediction={loadLocalPrediction(round.id)?.prediction ?? null}
                  index={i}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted border border-border rounded-xl bg-surface">
              <div className="text-4xl mb-3">⏳</div>
              <p>곧 새로운 배틀이 시작됩니다.</p>
            </div>
          )}
        </div>

        {/* Ended battles */}
        {endedRounds.length > 0 && (
          <div>
            <div className="mb-6">
              <div className="tag text-muted mb-1">// ENDED_BATTLES</div>
              <h2 className="text-2xl font-bold text-white">종료된 배틀</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {endedRounds.map((round, i) => (
                <BattleCard
                  key={round.id}
                  round={round}
                  userPrediction={loadLocalPrediction(round.id)?.prediction ?? null}
                  index={i}
                />
              ))}
            </div>
          </div>
        )}

        {/* Leaderboard link */}
        <div className="mt-16 text-center">
          <a
            href="/leaderboard"
            className="inline-flex items-center gap-2 px-6 py-3 border border-border text-muted rounded-lg hover:border-accent hover:text-accent transition-colors font-mono text-sm"
          >
            🏆 전체 인간 vs AI 전적 보기
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-muted text-xs font-mono">
        <div className="text-accent mb-1">AI_BATTLE v1.0.0</div>
        <div>Powered by Claude Sonnet 4.6 × Yahoo Finance</div>
      </footer>
    </main>
  )
}
