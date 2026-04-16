'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { getSupabase } from '@/lib/supabase'
import type { BattleRound, BattlePrediction } from '@/lib/types'
import LeaderboardTable from '@/components/LeaderboardTable'

export default function LeaderboardPage() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<Parameters<typeof LeaderboardTable>[0]['rows']>([])
  const [humanTotal, setHumanTotal] = useState({ wins: 0, total: 0 })
  const [aiTotal, setAiTotal] = useState({ wins: 0, total: 0 })

  useEffect(() => {
    async function fetchData() {
      const sb = getSupabase()
      if (!sb) return

      const { data: endedRounds } = await sb
        .from('battle_rounds')
        .select('*')
        .eq('status', 'ended')
        .not('end_price', 'is', null)
        .not('ai_prediction', 'is', null)
        .order('end_at', { ascending: false })

      if (!endedRounds || endedRounds.length === 0) {
        setLoading(false)
        return
      }

      const roundIds = endedRounds.map((r: BattleRound) => r.id)
      const { data: predictions } = await sb
        .from('battle_predictions')
        .select('*')
        .in('round_id', roundIds)

      const preds = (predictions ?? []) as BattlePrediction[]

      let humanWinsTotal = 0
      let humanPredTotal = 0
      let aiWinsTotal = 0
      let aiRoundsTotal = 0

      const tableRows = endedRounds.map((round: BattleRound) => {
        const actualDir = (round.end_price ?? 0) >= (round.start_price ?? 0) ? 'UP' : 'DOWN'
        const roundPreds = preds.filter(p => p.round_id === round.id)
        const humanWins = roundPreds.filter(p => p.prediction === actualDir).length
        const aiWon = round.ai_prediction === actualDir

        humanWinsTotal += humanWins
        humanPredTotal += roundPreds.length
        if (aiWon) aiWinsTotal++
        aiRoundsTotal++

        return {
          roundId: round.id,
          stockName: round.stock_name,
          stockSymbol: round.stock_symbol,
          humanWins,
          humanTotal: roundPreds.length,
          aiWon,
          endAt: round.end_at,
        }
      })

      setRows(tableRows)
      setHumanTotal({ wins: humanWinsTotal, total: humanPredTotal })
      setAiTotal({ wins: aiWinsTotal, total: aiRoundsTotal })
      setLoading(false)
    }
    fetchData()
  }, [])

  return (
    <main className="min-h-screen bg-bg">
      {/* Nav */}
      <div className="border-b border-border bg-surface/50">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-muted hover:text-white transition-colors font-mono text-sm">
            ← 배틀 목록
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="tag text-accent mb-2">// LEADERBOARD</div>
          <h1 className="text-3xl font-black text-white mb-2">인간 vs AI 전적</h1>
          <p className="text-muted mb-10">종료된 배틀의 통합 승패 기록입니다.</p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <LeaderboardTable rows={rows} humanTotal={humanTotal} aiTotal={aiTotal} />
        )}
      </div>
    </main>
  )
}
