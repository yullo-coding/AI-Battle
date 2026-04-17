'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'
import { loadSession, loadLocalPrediction, submitPrediction } from '@/lib/storage'
import { formatPrice } from '@/lib/stocks'
import type { BattleRound, UserSession, Direction } from '@/lib/types'
import CountdownTimer from '@/components/CountdownTimer'
import PredictionForm from '@/components/PredictionForm'
import ResultBanner from '@/components/ResultBanner'
import PhoneAuthModal from '@/components/PhoneAuthModal'

interface PageProps {
  params: { roundId: string }
}

export default function BattleDetailPage({ params }: PageProps) {
  const { roundId } = params

  const [round, setRound] = useState<BattleRound | null>(null)
  const [session, setSession] = useState<UserSession | null>(null)
  const [showAuth, setShowAuth] = useState(false)
  const [myPrediction, setMyPrediction] = useState<{ prediction: Direction; periodDays: number } | null>(null)
  const [stats, setStats] = useState({ upCount: 0, downCount: 0, total: 0 })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [pendingPrediction, setPendingPrediction] = useState<{ prediction: Direction; periodDays: number } | null>(null)

  // Load session & local prediction
  useEffect(() => {
    setSession(loadSession())
    const local = loadLocalPrediction(roundId)
    if (local) {
      setMyPrediction(local)
      setSubmitted(true)
    }
  }, [roundId])

  // Fetch round data
  useEffect(() => {
    async function fetchRound() {
      const sb = getSupabase()
      if (!sb) return

      const { data, error } = await sb
        .from('battle_rounds')
        .select('*')
        .eq('id', roundId)
        .single()

      if (!error && data) setRound(data as BattleRound)
      setLoading(false)
    }
    fetchRound()
  }, [roundId])

  // Fetch prediction stats
  useEffect(() => {
    async function fetchStats() {
      const sb = getSupabase()
      if (!sb) return

      const { data } = await sb
        .from('battle_predictions')
        .select('prediction')
        .eq('round_id', roundId)

      if (data) {
        const upCount = data.filter(d => d.prediction === 'UP').length
        const downCount = data.filter(d => d.prediction === 'DOWN').length
        setStats({ upCount, downCount, total: data.length })
      }
    }
    fetchStats()
  }, [roundId, submitted])

  async function handlePredictionSubmit(prediction: Direction, periodDays: number) {
    if (!session) {
      setPendingPrediction({ prediction, periodDays })
      setShowAuth(true)
      return
    }

    const result = await submitPrediction(
      roundId,
      session.phone,
      session.nickname,
      prediction,
      periodDays
    )

    if (result.success) {
      setMyPrediction({ prediction, periodDays })
      setSubmitted(true)
    } else {
      throw new Error(result.error)
    }
  }

  async function handleAuth(s: UserSession) {
    setSession(s)
    setShowAuth(false)
    // 인증 전에 선택한 예측이 있으면 자동 제출
    if (pendingPrediction) {
      const { prediction, periodDays } = pendingPrediction
      setPendingPrediction(null)
      const result = await submitPrediction(roundId, s.phone, s.nickname, prediction, periodDays)
      if (result.success) {
        setMyPrediction({ prediction, periodDays })
        setSubmitted(true)
      }
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  if (!round) {
    return (
      <main className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4">
        <div className="text-4xl">⚠️</div>
        <div className="text-white">배틀을 찾을 수 없습니다.</div>
        <Link href="/" className="text-accent hover:underline font-mono text-sm">← 홈으로</Link>
      </main>
    )
  }

  const price = round.start_price ?? 0

  const fmtPrice = formatPrice(price, round.stock_market)
  const isEnded = round.status === 'ended'
  const upPercent = stats.total > 0 ? Math.round((stats.upCount / stats.total) * 100) : 0
  const downPercent = 100 - upPercent

  return (
    <main className="min-h-screen bg-bg">
      {showAuth && <PhoneAuthModal onAuth={handleAuth} />}

      {/* Top nav */}
      <div className="border-b border-border bg-surface/50">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-muted hover:text-white transition-colors font-mono text-sm">
            ← 배틀 목록
          </Link>
          <Link href="/leaderboard" className="text-muted hover:text-accent transition-colors font-mono text-sm">
            🏆 리더보드
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
        {/* Stock header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-1">
            <span>{round.stock_market === 'KR' ? '🇰🇷' : '🇺🇸'}</span>
            <span className="tag text-muted">{round.stock_symbol}</span>
            {isEnded
              ? <span className="px-2 py-0.5 rounded text-xs font-mono bg-border text-muted">종료</span>
              : <span className="px-2 py-0.5 rounded text-xs font-mono bg-danger/20 text-danger animate-pulse">LIVE</span>
            }
          </div>
          <h1 className="text-3xl font-black text-white">{round.stock_name}</h1>
          <div className="text-2xl font-bold font-mono text-accent mt-2">{fmtPrice}</div>
        </motion.div>

        {/* Countdown or ended */}
        {isEnded ? null : (
          <div className="bg-surface border border-border rounded-xl p-6">
            <CountdownTimer endAt={round.end_at} />
          </div>
        )}

        {/* AI Prediction card */}
        {round.ai_prediction && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-surface border border-ai/40 rounded-xl p-6 glow-ai"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-ai/20 flex items-center justify-center text-sm">🤖</div>
              <div>
                <div className="tag text-ai">// AI_PREDICTION</div>
                <div className="text-xs text-muted">Claude Sonnet 4.6</div>
              </div>
              <div className="ml-auto text-right">
                <div className={`text-2xl font-bold font-mono ${round.ai_prediction === 'UP' ? 'text-up' : 'text-down'}`}>
                  {round.ai_prediction === 'UP' ? '▲ UP' : '▼ DOWN'}
                </div>
                <div className="text-xs text-muted font-mono">신뢰도 {round.ai_confidence}%</div>
              </div>
            </div>
            {round.ai_reasoning && (
              <p className="text-sm text-muted leading-relaxed border-t border-border pt-4">
                {round.ai_reasoning}
              </p>
            )}
          </motion.div>
        )}

        {/* Crowd stats */}
        {stats.total > 0 && (
          <div className="bg-surface border border-border rounded-xl p-6">
            <div className="tag text-muted mb-4">{'// CROWD_PREDICTION ('}{stats.total}{'명)'}</div>
            <div className="flex gap-4 mb-3">
              <div className="flex-1 text-center">
                <div className="text-up font-bold text-xl font-mono">▲ {upPercent}%</div>
                <div className="text-xs text-muted mt-1">상승 예측</div>
              </div>
              <div className="flex-1 text-center">
                <div className="text-down font-bold text-xl font-mono">▼ {downPercent}%</div>
                <div className="text-xs text-muted mt-1">하락 예측</div>
              </div>
            </div>
            <div className="h-2 bg-border rounded-full overflow-hidden flex">
              <div className="bg-up transition-all" style={{ width: `${upPercent}%` }} />
              <div className="bg-down transition-all" style={{ width: `${downPercent}%` }} />
            </div>
          </div>
        )}

        {/* Result or prediction form */}
        {isEnded && round.end_price && round.start_price && round.ai_prediction ? (
          <ResultBanner
            userPrediction={myPrediction?.prediction ?? ('UP' as Direction)}
            aiPrediction={round.ai_prediction}
            startPrice={round.start_price}
            endPrice={round.end_price}
            stockName={round.stock_name}
            market={round.stock_market}
          />
        ) : submitted && myPrediction ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface border border-accent/40 rounded-xl p-6 text-center glow-green"
          >
            <div className="text-3xl mb-3">⚔️</div>
            <div className="text-accent font-bold text-xl mb-1">예측 완료!</div>
            <div className="text-muted text-sm mb-4">결과가 나올 때까지 기다려주세요.</div>
            <div className="flex items-center justify-center gap-4 text-sm">
              <div>
                <div className="text-muted">내 예측</div>
                <div className={`font-bold font-mono text-lg ${myPrediction.prediction === 'UP' ? 'text-up' : 'text-down'}`}>
                  {myPrediction.prediction === 'UP' ? '▲ UP' : '▼ DOWN'}
                </div>
              </div>
              <div className="text-muted">vs</div>
              <div>
                <div className="text-muted">AI 예측</div>
                <div className={`font-bold font-mono text-lg ${round.ai_prediction === 'UP' ? 'text-up' : 'text-down'}`}>
                  {round.ai_prediction === 'UP' ? '▲ UP' : '▼ DOWN'}
                </div>
              </div>
            </div>
          </motion.div>
        ) : !isEnded ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-surface border border-border rounded-xl p-6"
          >
            <div className="tag text-muted mb-4">// YOUR_PREDICTION</div>
            {!session && (
              <div className="mb-4 p-3 bg-accent/10 border border-accent/30 rounded-lg text-sm text-accent flex items-center gap-2">
                <span>🔐</span>
                <span>방향 선택 후 제출하면 전화번호 인증 화면이 나옵니다.</span>
              </div>
            )}
            <PredictionForm
              onSubmit={handlePredictionSubmit}
              aiPrediction={round.ai_prediction}
              needsAuth={!session}
            />
          </motion.div>
        ) : null}
      </div>
    </main>
  )
}
