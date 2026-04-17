'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getSupabase } from '@/lib/supabase'
import { CURATED_STOCKS } from '@/lib/stocks'
import type { BattleRound } from '@/lib/types'

export default function AdminPage() {
  const [rounds, setRounds] = useState<BattleRound[]>([])
  const [creating, setCreating] = useState(false)
  const [selectedStock, setSelectedStock] = useState(CURATED_STOCKS[0].symbol)
  const [days, setDays] = useState(3)
  const [log, setLog] = useState('')

  async function fetchRounds() {
    const sb = getSupabase()
    if (!sb) return
    const { data } = await sb.from('battle_rounds').select('*').order('created_at', { ascending: false })
    if (data) setRounds(data as BattleRound[])
  }

  useEffect(() => { fetchRounds() }, [])

  async function createBattle() {
    setCreating(true)
    setLog('주가 데이터 + AI 예측 생성 중...')

    try {
      // 1. AI 예측 + 현재가 가져오기
      const res = await fetch('/api/ai-predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: selectedStock }),
      })

      const data = await res.json()

      if (!res.ok) {
        setLog(`에러: ${data.error}`)
        setCreating(false)
        return
      }

      const { prediction, confidence, reasoning, quote, mode } = data
      const modeLabel = mode === 'rule-based' ? '[룰베이스 테스트]' : '[Claude API]'
      setLog(`${modeLabel} AI 예측 완료: ${prediction} (신뢰도 ${confidence}%)\n배틀 라운드 생성 중...`)

      // 2. Supabase에 배틀 라운드 INSERT
      const sb = getSupabase()
      if (!sb) throw new Error('Supabase 연결 실패')

      const startAt = new Date()
      const endAt = new Date(startAt.getTime() + days * 24 * 60 * 60 * 1000)

      const { error } = await sb.from('battle_rounds').insert({
        stock_symbol: selectedStock,
        stock_name: quote.name,
        stock_market: quote.market,
        start_price: quote.price,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        status: 'active',
        ai_prediction: prediction,
        ai_confidence: confidence,
        ai_reasoning: reasoning,
      })

      if (error) throw error

      setLog(`✓ 배틀 생성 완료!\n종목: ${quote.name}\nAI: ${prediction} (${confidence}%)\n기간: ${days}일`)
      await fetchRounds()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setLog(`에러: ${msg}`)
    }

    setCreating(false)
  }

  async function endBattle(roundId: string, symbol: string) {
    setLog(`${symbol} 배틀 종료 중...`)
    try {
      // 현재가 가져와서 end_price 업데이트
      const res = await fetch(`/api/stocks?symbol=${symbol}`)
      const quote = await res.json()

      const sb = getSupabase()
      if (!sb) return

      await sb.from('battle_rounds').update({
        status: 'ended',
        end_price: quote.price,
      }).eq('id', roundId)

      setLog(`✓ 배틀 종료. 최종가: ${quote.price}`)
      await fetchRounds()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setLog(`에러: ${msg}`)
    }
  }

  async function deleteBattle(roundId: string) {
    const sb = getSupabase()
    if (!sb) return
    await sb.from('battle_rounds').delete().eq('id', roundId)
    setLog('삭제 완료')
    await fetchRounds()
  }

  return (
    <main className="min-h-screen bg-bg p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <div className="tag text-danger mb-1">// ADMIN_PANEL</div>
          <h1 className="text-2xl font-bold text-white">배틀 관리</h1>
          <p className="text-muted text-sm mt-1">배틀 라운드를 생성하고 관리하세요.</p>
        </div>

        {/* Create battle */}
        <div className="bg-surface border border-border rounded-xl p-6 mb-8">
          <div className="tag text-accent mb-4">// NEW_BATTLE</div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-muted font-mono mb-2">종목 선택</label>
              <select
                value={selectedStock}
                onChange={e => setSelectedStock(e.target.value)}
                className="w-full px-3 py-2 bg-surface-2 border border-border rounded-lg text-white text-sm font-mono focus:border-accent focus:outline-none"
              >
                {CURATED_STOCKS.map(s => (
                  <option key={s.symbol} value={s.symbol}>
                    {s.market === 'KR' ? '🇰🇷' : '🇺🇸'} {s.name} ({s.symbol})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted font-mono mb-2">배틀 기간: {days}일</label>
              <input
                type="range" min={1} max={7} value={days}
                onChange={e => setDays(Number(e.target.value))}
                className="w-full accent-accent mt-3"
              />
              <div className="flex justify-between text-xs text-muted font-mono mt-1">
                <span>1일</span><span>7일</span>
              </div>
            </div>
          </div>

          <button
            onClick={createBattle}
            disabled={creating}
            className={`w-full py-3 rounded-lg font-bold transition-all ${
              creating ? 'bg-border text-muted cursor-not-allowed' : 'bg-accent text-bg hover:bg-accent-dim cursor-pointer'
            }`}
          >
            {creating ? '생성 중...' : '⚔️ 배틀 생성 (AI 예측 자동 생성)'}
          </button>

          {log && (
            <pre className="mt-4 p-3 bg-black rounded-lg text-xs font-mono text-accent whitespace-pre-wrap border border-border">
              {log}
            </pre>
          )}
        </div>

        {/* Round list */}
        <div>
          <div className="tag text-muted mb-4">// BATTLE_ROUNDS ({rounds.length})</div>
          {rounds.length === 0 ? (
            <div className="text-center py-8 text-muted border border-border rounded-xl">
              배틀 없음. 위에서 생성하세요.
            </div>
          ) : (
            <div className="space-y-3">
              {rounds.map(r => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-4 bg-surface border border-border rounded-lg px-4 py-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-mono ${r.status === 'active' ? 'bg-danger/20 text-danger' : 'bg-border text-muted'}`}>
                        {r.status}
                      </span>
                      <span className="font-bold text-white">{r.stock_name}</span>
                      <span className="text-muted text-xs font-mono">{r.stock_symbol}</span>
                    </div>
                    <div className="text-xs text-muted mt-1 font-mono">
                      {new Date(r.start_at).toLocaleDateString('ko-KR')} → {new Date(r.end_at).toLocaleDateString('ko-KR')}
                      {r.ai_prediction && (
                        <span className={`ml-3 font-bold ${r.ai_prediction === 'UP' ? 'text-up' : 'text-down'}`}>
                          AI: {r.ai_prediction} {r.ai_confidence}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {r.status === 'active' && (
                      <button
                        onClick={() => endBattle(r.id, r.stock_symbol)}
                        className="px-3 py-1 text-xs border border-border text-muted rounded hover:border-danger hover:text-danger transition-colors font-mono"
                      >
                        종료
                      </button>
                    )}
                    <button
                      onClick={() => deleteBattle(r.id)}
                      className="px-3 py-1 text-xs border border-border text-muted rounded hover:border-danger hover:text-danger transition-colors font-mono"
                    >
                      삭제
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
