'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'
import { parseBattle } from '@/lib/types'
import type { Battle } from '@/lib/types'
import BattleResultCard from '@/components/BattleResultCard'

type PageState = 'loading' | 'resolving' | 'done' | 'error'

export default function BattleResultPage() {
  const { battleId } = useParams<{ battleId: string }>()
  const [battle, setBattle] = useState<Battle | null>(null)
  const [pageState, setPageState] = useState<PageState>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!battleId) return
    loadBattle(battleId)
  }, [battleId])

  async function loadBattle(id: string) {
    setPageState('loading')

    const sb = getSupabase()
    if (!sb) { setPageState('error'); setErrorMsg('Supabase 연결 실패'); return }

    const { data, error } = await sb
      .from('battles')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      setPageState('error')
      setErrorMsg('배틀을 찾을 수 없습니다')
      return
    }

    const b = parseBattle(data as Record<string, unknown>)

    // 아직 pending이고 결과 날짜 지났으면 자동 resolve
    if (b.status === 'pending') {
      const today = new Date().toISOString().split('T')[0]
      if (today >= b.end_date) {
        setPageState('resolving')
        try {
          const res = await fetch(`/api/battle/${id}/resolve`, { method: 'POST' })
          const json = await res.json()
          if (json.battle) {
            setBattle(parseBattle(json.battle as Record<string, unknown>))
            setPageState('done')
            return
          }
        } catch {
          // resolve 실패해도 기존 pending 상태 표시
        }
      }
    }

    setBattle(b)
    setPageState('done')
  }

  return (
    <main className="min-h-screen bg-bg">
      <div className="max-w-lg mx-auto px-6 py-8">

        {pageState === 'loading' && (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-muted text-sm font-mono">배틀 불러오는 중...</p>
          </div>
        )}

        {pageState === 'resolving' && (
          <div className="flex flex-col items-center justify-center py-32 space-y-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
              className="w-14 h-14 border-2 border-[#7C3AED] border-t-transparent rounded-full"
            />
            <div className="text-center space-y-2">
              <div className="tag text-[#7C3AED]">// RESOLVING</div>
              <p className="text-white font-bold">결과 계산 중...</p>
              <p className="text-muted text-sm">종가 데이터를 확인하고 있어요</p>
            </div>
          </div>
        )}

        {pageState === 'error' && (
          <div className="flex flex-col items-center justify-center py-32 space-y-4 text-center">
            <div className="text-5xl">⚠️</div>
            <p className="text-down text-sm">{errorMsg}</p>
            <Link
              href="/my-battles"
              className="px-6 py-2 border border-accent text-accent rounded-lg text-sm font-mono hover:bg-accent/10 transition-colors"
            >
              내 배틀 목록 →
            </Link>
          </div>
        )}

        {pageState === 'done' && battle && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div>
              <div className="tag text-accent mb-2">// BATTLE_RESULT</div>
              <h1 className="text-2xl font-black text-white">{battle.stock_name}</h1>
              <p className="text-muted text-sm font-mono mt-0.5">{battle.stock_symbol} · {battle.end_date}</p>
            </div>

            <BattleResultCard battle={battle} showLink={false} />

            <div className="flex gap-3">
              <Link
                href="/my-battles"
                className="flex-1 py-3 border border-border text-muted rounded-lg text-sm font-mono hover:border-white hover:text-white transition-colors text-center"
              >
                전체 전적 보기
              </Link>
              <Link
                href="/battle/new"
                className="flex-1 py-3 bg-accent text-bg font-bold rounded-lg hover:bg-accent-dim transition-colors text-center text-sm"
              >
                새 배틀 ⚔️
              </Link>
            </div>
          </motion.div>
        )}

      </div>
    </main>
  )
}
