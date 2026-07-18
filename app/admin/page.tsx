'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { formatPrice, formatPercent } from '@/lib/stocks'
import type { Battle } from '@/lib/types'
import { parseBattle } from '@/lib/types'
import { getAuthHeaders, restoreAuthenticatedSession } from '@/lib/storage'
import EmailAuthModal from '@/components/EmailAuthModal'
import Button from '@vibe/design-system/components/ui/Button'
import { useLocale } from '@/components/LocaleProvider'

export default function AdminPage() {
  const { tr } = useLocale()
  const [battles, setBattles] = useState<Battle[]>([])
  const [loading, setLoading] = useState(true)
  const [log, setLog] = useState('')
  const [access, setAccess] = useState<'checking' | 'login' | 'denied' | 'allowed'>('checking')
  const [showAuth, setShowAuth] = useState(false)

  async function fetchBattles() {
    const headers = await getAuthHeaders()
    const response = await fetch('/api/admin/battles', { headers })
    if (response.status === 401) { setAccess('login'); setLoading(false); return }
    if (response.status === 403) { setAccess('denied'); setLoading(false); return }
    const result = await response.json() as { battles?: Record<string, unknown>[] }
    if (response.ok && result.battles) {
      setBattles(result.battles.map(parseBattle))
      setAccess('allowed')
    }
    setLoading(false)
  }

  useEffect(() => {
    void restoreAuthenticatedSession().then(session => {
      if (!session) {
        setAccess('login')
        setLoading(false)
        return
      }
      void fetchBattles()
    })
  }, [])

  async function resolveBattle(id: string) {
    setLog(tr(`배틀 ${id.slice(0, 8)}... 결과 집계 중`, `Resolving battle ${id.slice(0, 8)}...`))
    try {
      const res = await fetch(`/api/battle/${id}/resolve`, { method: 'POST' })
      const data = await res.json()
      if (data.already) {
        setLog(tr('이미 결과가 확정된 배틀입니다.', 'This battle is already settled.'))
      } else if (data.error) {
        setLog(`${tr('오류', 'Error')}: ${data.error}`)
      } else {
        const b = data.battle as Battle
        setLog(tr(`✓ 결과 확정: 실제 ${b.actual_change_percent?.toFixed(2)}% → ${b.winner} 승`, `✓ Settled: actual ${b.actual_change_percent?.toFixed(2)}% → ${b.winner} wins`))
        await fetchBattles()
      }
    } catch (err: unknown) {
      setLog(`${tr('오류', 'Error')}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  async function deleteBattle(id: string) {
    const headers = await getAuthHeaders()
    const response = await fetch(`/api/admin/battles?id=${encodeURIComponent(id)}`, { method: 'DELETE', headers })
    if (!response.ok) { setLog(tr('삭제 권한이 없거나 요청에 실패했습니다.', 'Delete failed or access was denied.')); return }
    setLog(tr(`배틀 ${id.slice(0, 8)}... 삭제됨`, `Battle ${id.slice(0, 8)}... deleted`))
    await fetchBattles()
  }

  function handleAuth() {
    setShowAuth(false)
    setLoading(true)
    void fetchBattles()
  }

  const pending = battles.filter(b => b.status === 'pending')
  const resolved = battles.filter(b => b.status === 'resolved')
  const userWins = resolved.filter(b => b.winner === 'USER').length
  const aiWins = resolved.filter(b => b.winner === 'AI').length
  const ties = resolved.filter(b => b.winner === 'TIE').length

  if (access === 'checking') {
    return <main className="min-h-screen bg-bg flex items-center justify-center"><div className="w-9 h-9 border-2 border-accent border-t-transparent rounded-full animate-spin" /></main>
  }

  if (access === 'login' || access === 'denied') {
    return (
      <main className="min-h-screen bg-bg flex items-center justify-center px-6">
        {showAuth && <EmailAuthModal onAuth={handleAuth} onClose={() => setShowAuth(false)} />}
        <div className="max-w-md w-full bg-surface border border-border rounded-2xl p-8 text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-2xl font-black text-white mb-2">{access === 'denied' ? tr('관리자 전용 페이지', 'Admin access only') : tr('관리자 로그인이 필요합니다', 'Admin sign-in required')}</h1>
          <p className="text-sm text-muted mb-6">{access === 'denied' ? tr('현재 계정에는 관리자 권한이 없습니다.', 'This account does not have admin access.') : tr('인증된 관리자 이메일로 로그인해주세요.', 'Sign in with an authorized admin email.')}</p>
          {access === 'login' && <Button className="w-full" onClick={() => setShowAuth(true)}>{tr('이메일 인증하기', 'Verify email')}</Button>}
          <Link href="/" className="block mt-4 text-sm text-muted hover:text-white">← {tr('홈으로', 'Back home')}</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-bg p-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="tag text-danger mb-1">ADMIN</div>
            <h1 className="text-2xl font-bold text-white">{tr('배틀 관리', 'Battle Management')}</h1>
          </div>
          <Link
            href="/"
            className="text-muted text-xs font-mono hover:text-white transition-colors"
          >
            ← {tr('홈', 'Home')}
          </Link>
        </div>

        {/* Stats */}
        {resolved.length > 0 && (
          <div className="grid grid-cols-4 gap-3 mb-8">
            <StatCard label={tr('전체', 'Total')} value={battles.length} color="text-white" />
            <StatCard label={tr('인간 승', 'Human wins')} value={userWins} color="text-up" />
            <StatCard label={tr('AI 승', 'AI wins')} value={aiWins} color="text-[#A78BFA]" />
            <StatCard label={tr('무승부', 'Draws')} value={ties} color="text-muted" />
          </div>
        )}

        {/* Log */}
        {log && (
          <pre className="mb-6 p-3 bg-black rounded-lg text-xs font-mono text-accent whitespace-pre-wrap border border-border">
            {log}
          </pre>
        )}

        {/* Pending battles */}
        {pending.length > 0 && (
          <div className="mb-8">
            <div className="tag text-accent mb-4">{tr('진행 중', 'In progress')} ({pending.length})</div>
            <div className="space-y-2">
              {pending.map(b => (
                <BattleRow
                  key={b.id}
                  battle={b}
                  onResolve={() => resolveBattle(b.id)}
                  onDelete={() => deleteBattle(b.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Resolved battles */}
        <div>
          <div className="tag text-muted mb-4">{tr('완료', 'Settled')} ({resolved.length})</div>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : resolved.length === 0 ? (
            <div className="text-center py-8 text-muted border border-border rounded-xl text-sm">
              {tr('결과가 확정된 배틀이 없습니다.', 'No settled battles yet.')}
            </div>
          ) : (
            <div className="space-y-2">
              {resolved.map(b => (
                <BattleRow
                  key={b.id}
                  battle={b}
                  onDelete={() => deleteBattle(b.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4 text-center">
      <div className={`text-2xl font-black font-mono ${color}`}>{value}</div>
      <div className="text-muted text-xs mt-1">{label}</div>
    </div>
  )
}

function BattleRow({
  battle: b,
  onResolve,
  onDelete,
}: {
  battle: Battle
  onResolve?: () => void
  onDelete: () => void
}) {
  const { tr } = useLocale()
  const mkt = b.stock_market as 'US' | 'KR'
  const today = new Date().toISOString().split('T')[0]
  const canResolve = b.status === 'pending' && today >= b.end_date

  const winnerColor = b.winner === 'USER' ? 'text-up' : b.winner === 'AI' ? 'text-[#A78BFA]' : 'text-muted'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-3 bg-surface border border-border rounded-lg px-4 py-3 text-sm"
    >
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{
        background: b.status === 'pending' ? '#00FF88' : '#444'
      }} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-white">{b.stock_name}</span>
          <span className="text-muted text-xs font-mono">{b.stock_symbol}</span>
          <span className="text-xs text-muted font-mono">→ {b.end_date}</span>
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs font-mono text-muted flex-wrap">
          <span>{tr('시작', 'Start')} {formatPrice(b.start_price, mkt)}</span>
          <span>{tr('나', 'Me')} {formatPercent(b.user_change_percent ?? 0)}</span>
          <span className="text-[#A78BFA]">AI {formatPercent(b.ai_change_percent ?? 0)}</span>
          {b.actual_change_percent != null && (
            <span className={b.actual_change_percent >= 0 ? 'text-up' : 'text-down'}>
              {tr('실제', 'Actual')} {formatPercent(b.actual_change_percent)}
            </span>
          )}
          {b.winner && <span className={`font-bold ${winnerColor}`}>{b.winner}</span>}
        </div>
        <div className="text-xs text-muted/60 font-mono mt-0.5">
          {b.email} · {b.id.slice(0, 8)}
        </div>
      </div>

      <div className="flex gap-2 flex-shrink-0">
        <Link
          href={`/battle/${b.id}`}
          className="px-2 py-1 text-xs border border-border text-muted rounded hover:border-accent hover:text-accent transition-colors font-mono"
        >
          {tr('보기', 'View')}
        </Link>
        {canResolve && onResolve && (
          <Button size="sm" variant="secondary" onClick={onResolve}>{tr('확정', 'Settle')}</Button>
        )}
        <Button size="sm" variant="danger" onClick={onDelete}>{tr('삭제', 'Delete')}</Button>
      </div>
    </motion.div>
  )
}
