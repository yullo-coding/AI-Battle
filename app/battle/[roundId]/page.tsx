'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'
import type { Battle } from '@/lib/types'
import BattleResultCard from '@/components/BattleResultCard'

export default function BattleResultPage({ params }: { params: { roundId: string } }) {
  const battleId = params.roundId
  const [battle, setBattle] = useState<Battle | null>(null)
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState(false)
  const [error, setError] = useState('')

  const loadBattle = useCallback(async () => {
    const sb = getSupabase()
    if (!sb) return

    const { data, error: fetchErr } = await sb
      .from('battles')
      .select('*')
      .eq('id', battleId)
      .single()

    if (fetchErr || !data) {
      setError('배틀을 찾을 수 없습니다.')
      setLoading(false)
      return
    }

    const b = data as Battle
    setBattle(b)
    setLoading(false)

    // Auto-resolve if end_date has passed
    const today = new Date().toISOString().split('T')[0]
    if (b.status === 'pending' && today >= b.end_date) {
      setResolving(true)
      try {
        const res = await fetch(`/api/battle/${battleId}/resolve`, { method: 'POST' })
        if (res.ok) {
          const result = await res.json()
          if (result.battle) setBattle(result.battle as Battle)
        }
      } catch { /* ignore */ }
      setResolving(false)
    }
  }, [battleId])

  useEffect(() => {
    loadBattle()
  }, [loadBattle])

  return (
    <main className="min-h-screen bg-bg">
      {/* Nav */}
      <div className="border-b border-border bg-surface/50">
        <div className="max-w-lg mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/my-battles" className="text-muted text-xs font-mono hover:text-white transition-colors">
            ← 내 배틀
          </Link>
          <Link href="/" className="text-muted text-xs font-mono hover:text-white transition-colors">
            홈
          </Link>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 py-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">😕</div>
            <p className="text-muted">{error}</p>
            <Link href="/" className="mt-4 inline-block text-accent font-mono text-sm hover:underline">
              홈으로 →
            </Link>
          </div>
        ) : battle ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {resolving && (
              <div className="flex items-center gap-3 p-4 bg-accent/10 border border-accent/30 rounded-xl">
                <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin flex-shrink-0" />
                <span className="text-accent text-sm font-mono">결과 집계 중...</span>
              </div>
            )}

            <BattleResultCard battle={battle} showLink={false} />

            <div className="flex gap-3 pt-2">
              <Link
                href="/my-battles"
                className="flex-1 py-3 border border-border text-muted rounded-lg text-sm font-mono hover:border-white hover:text-white transition-colors text-center"
              >
                내 배틀 전적
              </Link>
              <Link
                href="/battle/new"
                className="flex-1 py-3 bg-accent text-bg font-bold rounded-lg hover:bg-accent-dim transition-colors text-center text-sm"
              >
                새 배틀 시작 ⚔️
              </Link>
            </div>
          </motion.div>
        ) : null}
      </div>
    </main>
  )
}
