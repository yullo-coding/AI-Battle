'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'
import { parseBattle } from '@/lib/types'
import type { Battle, AIReasoning } from '@/lib/types'
import { formatPrice, formatPercent } from '@/lib/stocks'
import CountdownTimer from '@/components/CountdownTimer'

type PageState = 'loading' | 'ready-to-resolve' | 'resolving' | 'done' | 'error'

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
    setBattle(b)

    if (b.status === 'resolved') {
      setPageState('done')
      return
    }

    // pending: 결과 날짜 지났으면 "결과 보기" 버튼 표시
    const today = new Date().toISOString().split('T')[0]
    if (today >= b.end_date) {
      setPageState('ready-to-resolve')
    } else {
      setPageState('done') // pending + 아직 날짜 전 → BattleResultCard가 카운트다운 표시
    }
  }

  async function handleReveal() {
    if (!battleId) return
    setPageState('resolving')
    try {
      const res = await fetch(`/api/battle/${battleId}/resolve`, { method: 'POST' })
      const json = await res.json()
      if (json.battle) {
        setBattle(parseBattle(json.battle as Record<string, unknown>))
        setPageState('done')
        return
      }
      setErrorMsg(json.error ?? '집계 실패')
      setPageState('error')
    } catch {
      setErrorMsg('네트워크 오류')
      setPageState('error')
    }
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
              className="w-14 h-14 border-2 border-[#A78BFA] border-t-transparent rounded-full"
            />
            <div className="text-center space-y-2">
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

        {pageState === 'ready-to-resolve' && battle && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div>
              <h1 className="text-2xl font-black text-white">{battle.stock_name}</h1>
              <p className="text-muted text-sm font-mono mt-0.5">{battle.stock_symbol} · {battle.end_date}</p>
            </div>

            {/* Teaser card */}
            <div className="border border-border rounded-xl p-5 space-y-4 bg-surface">
              <div className="text-xs font-mono text-muted mb-1">예측 결과 대기 중</div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-bg border border-human/20">
                  <div className="text-xs font-mono text-human mb-1">내 예측</div>
                  <div className={`text-xl font-black font-mono ${(battle.user_change_percent ?? 0) >= 0 ? 'text-up' : 'text-down'}`}>
                    {formatPercent(battle.user_change_percent ?? 0)}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-bg border border-ai/20">
                  <div className="text-xs font-mono text-ai mb-1">{battle.ai_tool_name ?? 'AI 도구'} 예측</div>
                  <div className={`text-xl font-black font-mono ${(battle.ai_change_percent ?? 0) >= 0 ? 'text-up' : 'text-down'}`}>
                    {formatPercent(battle.ai_change_percent ?? 0)}
                  </div>
                </div>
              </div>

              <div className="text-center text-xs text-muted font-mono">결과 확인일 {battle.end_date} 도달 — 승부를 확인하세요</div>
            </div>

            <button
              onClick={handleReveal}
              className="w-full py-4 bg-accent text-bg font-black rounded-xl text-base hover:bg-accent-dim transition-colors animate-[buttonPulse_2s_ease-out_infinite]"
            >
              결과 보기 🔍
            </button>

            <Link
              href="/my-battles"
              className="block text-center py-2 text-muted text-sm font-mono hover:text-white transition-colors"
            >
              내 배틀 목록 →
            </Link>
          </motion.div>
        )}

        {pageState === 'done' && battle && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            <BattleDetail battle={battle} />

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

// ─── 상세 결과 컴포넌트 ──────────────────────────────────────
function BattleDetail({ battle }: { battle: Battle }) {
  const mkt = battle.stock_market as 'US' | 'KR'
  const isPending = battle.status === 'pending'
  const endDatetime = `${battle.end_date}T23:59:59+09:00`

  const userPct = battle.user_change_percent ?? 0
  const aiPct = battle.ai_change_percent ?? 0
  const actualPct = battle.actual_change_percent ?? 0
  const winner = battle.winner

  let reasoning: AIReasoning | null = null
  if (battle.ai_reasoning) {
    try { reasoning = JSON.parse(battle.ai_reasoning) as AIReasoning } catch { /* ignore */ }
  }

  const winnerLabel = winner === 'USER' ? '🏆 인간 승리!' : winner === 'AI' ? '🤖 AI 승리!' : '🤝 무승부'
  const winnerColor = winner === 'USER' ? 'text-bg bg-up' : winner === 'AI' ? 'text-white bg-[#A78BFA]' : 'text-bg bg-accent'

  return (
    <div className="space-y-4">
      {/* 종목 헤더 */}
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <span>{mkt === 'KR' ? '🇰🇷' : '🇺🇸'}</span>
          <h1 className="text-2xl font-black text-white">{battle.stock_name}</h1>
          <span className="text-muted text-sm font-mono">{battle.stock_symbol}</span>
        </div>
        <div className="text-xs font-mono text-muted">{battle.created_at.slice(0,10)} → {battle.end_date}</div>
      </div>

      {/* 승패 배너 or 카운트다운 */}
      {isPending ? (
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="text-xs font-mono text-muted mb-3">결과 확인까지</div>
          <CountdownTimer endAt={endDatetime} />
        </div>
      ) : (
        <div className={`rounded-xl px-5 py-4 text-center ${winnerColor}`}>
          <div className="text-2xl font-black">{winnerLabel}</div>
        </div>
      )}

      {/* 예측 vs 실제 비교 */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="grid grid-cols-3 divide-x divide-border text-center py-5">
          <div className="px-4">
            <div className="text-xs font-mono text-muted mb-1">내 예측</div>
            <div className={`text-2xl font-black font-mono ${userPct >= 0 ? 'text-up' : 'text-down'}`}>
              {formatPercent(userPct)}
            </div>
            {battle.user_error != null && (
              <div className="text-xs text-muted mt-1">오차 {battle.user_error.toFixed(2)}%p</div>
            )}
          </div>
          <div className="px-4">
            <div className="text-xs font-mono text-muted mb-1">실제</div>
            <div className={`text-2xl font-black font-mono ${actualPct >= 0 ? 'text-up' : 'text-down'}`}>
              {isPending ? '—' : formatPercent(actualPct)}
            </div>
            {battle.start_price && battle.end_price && (
              <div className="text-[10px] text-muted mt-1 font-mono">
                {formatPrice(battle.start_price, mkt)} → {formatPrice(battle.end_price, mkt)}
              </div>
            )}
          </div>
          <div className="px-4">
            <div className="text-xs font-mono text-muted mb-1">{battle.ai_tool_name ?? 'AI 도구'} 예측</div>
            <div className="text-2xl font-black font-mono text-[#A78BFA]">
              {formatPercent(aiPct)}
            </div>
            {battle.ai_error != null && (
              <div className="text-xs text-muted mt-1">오차 {battle.ai_error.toFixed(2)}%p</div>
            )}
          </div>
        </div>

        {/* 오차 비교 바 */}
        {battle.user_error != null && battle.ai_error != null && (
          <div className="border-t border-border px-5 py-4 space-y-3">
            <div className="text-xs font-mono text-muted">오차 비교 — 작을수록 정확</div>
            {[
              { label: '나', error: battle.user_error, color: 'bg-up', labelColor: 'text-up', isWinner: winner === 'USER' },
              { label: 'AI', error: battle.ai_error, color: 'bg-[#A78BFA]', labelColor: 'text-[#A78BFA]', isWinner: winner === 'AI' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className={item.labelColor}>{item.label}</span>
                  <span className={item.isWinner ? `${item.labelColor} font-bold` : 'text-muted'}>
                    {item.error.toFixed(2)}%p {item.isWinner ? '✓' : ''}
                  </span>
                </div>
                <div className="h-2 bg-border rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full`} style={{ width: `${Math.min(100, item.error * 5)}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI 상세 분석 */}
      {reasoning && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <div className="text-xs font-mono text-[#A78BFA] font-bold">🤖 AI 상세 분석</div>
          </div>
          <div className="divide-y divide-border">
            {[
              { label: '기술적 지표', text: reasoning.technical },
              { label: '시장 심리', text: reasoning.sentiment },
              { label: '리스크 요인', text: reasoning.risk },
              { label: '종합 결론', text: reasoning.conclusion },
            ].filter(s => s.text).map(section => (
              <div key={section.label} className="px-5 py-4">
                <div className="text-[10px] font-mono text-muted mb-1">{section.label}</div>
                <p className="text-sm text-white/80 leading-relaxed">{section.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
