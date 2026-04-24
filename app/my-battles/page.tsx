'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'
import { loadSession } from '@/lib/storage'
import type { Battle, UserSession } from '@/lib/types'
import { parseBattle } from '@/lib/types'
import BattleResultCard from '@/components/BattleResultCard'
import EmailAuthModal from '@/components/EmailAuthModal'

export default function MyBattlesPage() {
  const [session, setSession] = useState<UserSession | null>(null)
  const [showAuth, setShowAuth] = useState(false)
  const [battles, setBattles] = useState<Battle[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const s = loadSession()
    setSession(s)
    if (s) {
      loadBattles(s.email)
    } else {
      setLoading(false)
    }
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

    if (data) setBattles(data.map(r => parseBattle(r as Record<string, unknown>)))
    setLoading(false)
  }

  function handleAuth(s: UserSession) {
    setSession(s)
    setShowAuth(false)
    loadBattles(s.email)
  }

  // Stats
  const resolved = battles.filter(b => b.status === 'resolved')
  const wins = resolved.filter(b => b.winner === 'USER').length
  const losses = resolved.filter(b => b.winner === 'AI').length
  const ties = resolved.filter(b => b.winner === 'TIE').length

  return (
    <main className="min-h-screen bg-bg">
      {showAuth && <EmailAuthModal onAuth={handleAuth} />}

      {/* Nav */}
      <div className="border-b border-border bg-surface/50">
        <div className="max-w-lg mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-muted text-xs font-mono hover:text-white transition-colors">
            ← 홈
          </Link>
          <Link href="/battle/new" className="text-accent text-xs font-mono hover:text-accent-dim transition-colors">
            새 배틀 ⚔️
          </Link>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="tag text-accent mb-2">// MY_BATTLES</div>
          <h1 className="text-2xl font-black text-white mb-1">내 배틀 전적</h1>
          {session && (
            <p className="text-muted text-sm mb-6">
              <span className="text-accent font-mono">{session.nickname}</span>님의 전적
            </p>
          )}
        </motion.div>

        {!session ? (
          <div className="text-center py-20 space-y-4">
            <div className="text-5xl">⚔️</div>
            <p className="text-muted">로그인하면 전적을 확인할 수 있습니다.</p>
            <button
              onClick={() => setShowAuth(true)}
              className="px-6 py-3 bg-accent text-bg font-bold rounded-lg hover:bg-accent-dim transition-colors"
            >
              이메일로 로그인
            </button>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : battles.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <div className="text-5xl">🥊</div>
            <p className="text-muted">아직 참여한 배틀이 없습니다.</p>
            <Link
              href="/battle/new"
              className="inline-block px-6 py-3 bg-accent text-bg font-bold rounded-lg hover:bg-accent-dim transition-colors"
            >
              첫 배틀 시작하기 →
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats summary */}
            {resolved.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="승" value={wins} color="text-up" />
                <StatCard label="패" value={losses} color="text-down" />
                <StatCard label="무" value={ties} color="text-muted" />
              </div>
            )}

            {/* Win rate */}
            {resolved.length > 0 && (
              <div className="bg-surface border border-border rounded-xl p-4">
                <div className="flex justify-between text-xs font-mono mb-2">
                  <span className="text-muted">승률</span>
                  <span className="text-accent font-bold">
                    {resolved.length > 0 ? Math.round((wins / resolved.length) * 100) : 0}%
                    <span className="text-muted font-normal ml-1">({resolved.length}전)</span>
                  </span>
                </div>
                <div className="h-2 bg-border rounded-full overflow-hidden flex">
                  <div className="bg-up" style={{ width: `${resolved.length > 0 ? (wins / resolved.length) * 100 : 0}%` }} />
                  <div className="bg-down" style={{ width: `${resolved.length > 0 ? (losses / resolved.length) * 100 : 0}%` }} />
                </div>
              </div>
            )}

            {/* Battle list */}
            <div className="space-y-4">
              {battles.map((battle, i) => (
                <motion.div
                  key={battle.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <BattleResultCard battle={battle} />
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4 text-center">
      <div className={`text-3xl font-black font-mono ${color}`}>{value}</div>
      <div className="text-muted text-xs mt-1">{label}</div>
    </div>
  )
}
