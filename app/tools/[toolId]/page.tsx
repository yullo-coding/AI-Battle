'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Button from '@vibe/design-system/components/ui/Button'
import Card from '@vibe/design-system/components/ui/Card'
import Textarea from '@vibe/design-system/components/ui/Textarea'
import Badge from '@vibe/design-system/components/ui/Badge'
import { fetchAITool, toolAvailability } from '@/lib/aiTools'
import { getSupabase } from '@/lib/supabase'
import { loadSession } from '@/lib/storage'
import type { AITool, AIToolReview, UserSession } from '@/lib/types'
import EmailAuthModal from '@/components/EmailAuthModal'

export default function ToolDetailPage() {
  const params = useParams<{ toolId: string }>()
  const [tool, setTool] = useState<AITool | null>(null)
  const [reviews, setReviews] = useState<AIToolReview[]>([])
  const [session, setSession] = useState<UserSession | null>(null)
  const [showAuth, setShowAuth] = useState(false)
  const [liked, setLiked] = useState(false)
  const [rating, setRating] = useState(5)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const result = await fetchAITool(params.toolId)
      setTool(result.tool)
      setReviews(result.reviews)
      const current = loadSession()
      setSession(current)
      if (current) {
        const sb = getSupabase()
        const { data } = await sb!.from('ai_tool_likes').select('id').eq('tool_id', params.toolId).eq('user_email', current.email).maybeSingle()
        setLiked(Boolean(data))
      }
    } catch { setError('도구를 불러오지 못했습니다.') }
    setLoading(false)
  }, [params.toolId])

  useEffect(() => { load() }, [load])

  async function toggleLike() {
    if (!session) { setShowAuth(true); return }
    const sb = getSupabase()
    if (!sb || !tool) return
    if (liked) {
      await sb.from('ai_tool_likes').delete().eq('tool_id', tool.id).eq('user_email', session.email)
    } else {
      await sb.from('ai_tool_likes').insert({ tool_id: tool.id, user_email: session.email })
    }
    setLiked(!liked)
    setTool({ ...tool, like_count: Math.max(0, (tool.like_count ?? 0) + (liked ? -1 : 1)) })
  }

  async function submitReview(e: FormEvent) {
    e.preventDefault()
    if (!session) { setShowAuth(true); return }
    if (!tool || content.trim().length < 10) return
    const sb = getSupabase()
    if (!sb) return
    const { error: reviewError } = await sb.from('ai_tool_reviews').upsert({
      tool_id: tool.id,
      user_email: session.email,
      nickname: session.nickname,
      rating,
      content: content.trim(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'tool_id,user_email' })
    if (reviewError) { setError('리뷰를 저장하지 못했습니다.'); return }
    setContent('')
    await load()
  }

  if (loading) return <main className="min-h-screen bg-bg flex items-center justify-center text-muted">불러오는 중...</main>
  if (error || !tool) return <main className="min-h-screen bg-bg flex items-center justify-center text-danger">{error || '도구가 없습니다.'}</main>

  const availability = toolAvailability(tool)
  return (
    <main className="min-h-screen bg-bg">
      {showAuth && <EmailAuthModal onAuth={s => { setSession(s); setShowAuth(false) }} onClose={() => setShowAuth(false)} />}
      <section className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        <Link href="/tools" className="text-sm text-muted hover:text-white">← 도구 목록</Link>

        <Card className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-4">
              <div className="w-14 h-14 rounded-xl border border-border bg-surface-2 flex items-center justify-center text-2xl">🤖</div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-black text-white">{tool.name}</h1>
                  {tool.is_featured && <span className="text-accent">✓</span>}
                </div>
                <p className="text-muted">{tool.tagline}</p>
              </div>
            </div>
            <Badge variant={availability.battleReady ? 'accent' : 'muted'} dot>{availability.label}</Badge>
          </div>

          <p className="text-white/80 leading-7 whitespace-pre-wrap">{tool.description}</p>

          <div className="flex flex-wrap gap-2 text-xs text-muted font-mono">
            <span className="px-3 py-1.5 border border-border rounded-full">{tool.pricing === 'free' ? '무료' : tool.pricing === 'freemium' ? '부분 무료' : '유료'}</span>
            <span className="px-3 py-1.5 border border-border rounded-full">지원 시장 {tool.supported_markets.join(' · ')}</span>
            <span className="px-3 py-1.5 border border-border rounded-full">★ {tool.average_rating?.toFixed(1) ?? '-'} · 리뷰 {tool.review_count ?? 0}</span>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 pt-2">
            <a href={tool.website_url} target="_blank" rel="noopener noreferrer" className="sm:col-span-2"><Button variant="secondary" size="lg" className="w-full">도구 방문 ↗</Button></a>
            <Button variant={liked ? 'danger' : 'secondary'} size="lg" onClick={toggleLike}>♥ {tool.like_count ?? 0}</Button>
          </div>

          {availability.battleReady ? (
            <Link href={`/battle/new?tool=${tool.id}`}><Button size="lg" className="w-full">이 도구와 배틀하기 ⚔️</Button></Link>
          ) : (
            <div className="p-4 rounded-lg bg-white/[0.04] border border-border text-sm text-muted">
              이 도구는 현재 링크·리뷰 전용입니다. 제작자가 표준 예측 API 검증을 마치면 자동 배틀이 열립니다.
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-black text-white mb-4">사용 후기 남기기</h2>
          <form onSubmit={submitReview} className="space-y-4">
            <div className="flex gap-2" aria-label="별점">
              {[1, 2, 3, 4, 5].map(value => (
                <Button key={value} type="button" size="sm" variant="ghost" onClick={() => setRating(value)} className={value <= rating ? 'text-yellow-300' : 'text-muted'}>★</Button>
              ))}
            </div>
            <Textarea value={content} onChange={e => setContent(e.target.value)} minLength={10} maxLength={1000} currentLength={content.length} placeholder="직접 사용해본 점, 좋았던 점과 아쉬운 점을 10자 이상 적어주세요." />
            <Button type="submit">리뷰 저장</Button>
          </form>
        </Card>

        <div className="space-y-3">
          <h2 className="text-lg font-black text-white">리뷰 {reviews.length}</h2>
          {reviews.length ? reviews.map(review => (
            <Card key={review.id} className="p-4">
              <div className="flex justify-between gap-3 mb-2">
                <strong className="text-white">{review.nickname}</strong>
                <span className="text-yellow-300 tracking-wider">{'★'.repeat(review.rating)}<span className="text-border">{'★'.repeat(5 - review.rating)}</span></span>
              </div>
              <p className="text-sm text-white/75 leading-6">{review.content}</p>
            </Card>
          )) : <div className="p-8 border border-border rounded-xl text-center text-muted">첫 리뷰를 남겨주세요.</div>}
        </div>
      </section>
    </main>
  )
}
