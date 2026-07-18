'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Button from '@vibe/design-system/components/ui/Button'
import Card from '@vibe/design-system/components/ui/Card'
import Textarea from '@vibe/design-system/components/ui/Textarea'
import Badge from '@vibe/design-system/components/ui/Badge'
import { fetchAITool, localizedTool, toolAvailability } from '@/lib/aiTools'
import { getSupabase } from '@/lib/supabase'
import { loadSession, restoreAuthenticatedSession } from '@/lib/storage'
import type { AITool, AIToolReview, UserSession } from '@/lib/types'
import EmailAuthModal from '@/components/EmailAuthModal'
import { useLocale } from '@/components/LocaleProvider'

export default function ToolDetailPage() {
  const { locale, tr } = useLocale()
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
      const current = loadSession() ?? await restoreAuthenticatedSession()
      setSession(current)
      if (current) {
        const sb = getSupabase()
        const { data } = await sb!.from('ai_tool_likes').select('id').eq('tool_id', params.toolId).eq('user_id', current.userId).maybeSingle()
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
      await sb.from('ai_tool_likes').delete().eq('tool_id', tool.id).eq('user_id', session.userId)
    } else {
      await sb.from('ai_tool_likes').insert({ tool_id: tool.id, user_id: session.userId, user_email: session.email })
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
      user_id: session.userId,
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

  if (loading) return <main className="min-h-screen bg-bg flex items-center justify-center text-muted">{tr('불러오는 중...', 'Loading...')}</main>
  if (error || !tool) return <main className="min-h-screen bg-bg flex items-center justify-center text-danger">{error || tr('도구가 없습니다.', 'Tool not found.')}</main>

  const availability = toolAvailability(tool)
  const copy = localizedTool(tool, locale)
  return (
    <main className="min-h-screen bg-bg">
      {showAuth && <EmailAuthModal onAuth={s => { setSession(s); setShowAuth(false) }} onClose={() => setShowAuth(false)} />}
      <section className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        <Link href="/tools" className="text-sm text-muted hover:text-white">← {tr('도구 목록', 'Tool directory')}</Link>

        <Card className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-4">
              <div className="w-14 h-14 rounded-xl border border-border bg-surface-2 flex items-center justify-center text-2xl">🤖</div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-black text-white">{copy.name}</h1>
                  {tool.is_featured && <span className="text-accent">✓</span>}
                </div>
                <p className="text-muted">{copy.tagline}</p>
              </div>
            </div>
            <Badge variant={availability.battleReady ? 'accent' : 'muted'} dot>{availability.battleReady ? tr('배틀 가능', 'Battle ready') : tr('링크·리뷰 전용', 'Review only')}</Badge>
          </div>

          <p className="text-white/80 leading-7 whitespace-pre-wrap">{copy.description}</p>

          <div className="flex flex-wrap gap-2 text-xs text-muted font-mono">
            <span className="px-3 py-1.5 border border-border rounded-full">{tool.pricing === 'free' ? tr('무료', 'Free') : tool.pricing === 'freemium' ? tr('부분 무료', 'Freemium') : tr('유료', 'Paid')}</span>
            <span className="px-3 py-1.5 border border-border rounded-full">{tr('지원 시장', 'Markets')} {tool.supported_markets.join(' · ')}</span>
            <span className="px-3 py-1.5 border border-border rounded-full">★ {tool.average_rating?.toFixed(1) ?? '-'} · {tr('리뷰', 'Reviews')} {tool.review_count ?? 0}</span>
            {availability.battleReady && <span className="px-3 py-1.5 border border-accent/50 text-accent rounded-full">AI Battle API {tool.api_version ?? '내장'}</span>}
          </div>

          <div className="grid sm:grid-cols-3 gap-3 pt-2">
            <a href={tool.website_url} target="_blank" rel="noopener noreferrer" className="sm:col-span-2"><Button variant="secondary" size="lg" className="w-full">{tr('도구 방문', 'Visit tool')} ↗</Button></a>
            <Button variant={liked ? 'danger' : 'secondary'} size="lg" onClick={toggleLike}>♥ {tool.like_count ?? 0}</Button>
          </div>

          {availability.battleReady ? (
            <Link href={`/battle/new?tool=${tool.id}`}><Button size="lg" className="w-full">{tr('이 도구와 배틀하기', 'Battle this tool')} ⚔️</Button></Link>
          ) : (
            <div className="p-4 rounded-lg bg-white/[0.04] border border-border text-sm text-muted">
              {tr('이 도구는 현재 링크·리뷰 전용입니다. 제작자가 표준 예측 API 검증을 마치면 자동 배틀이 열립니다.', 'This tool is currently review-only. Battles open after the builder passes prediction API verification.')}
            </div>
          )}

          {tool.integration_type === 'api' && tool.verification_status === 'verified' && (
            <div className="p-4 rounded-lg bg-accent/[0.05] border border-accent/30 text-sm text-muted leading-relaxed">
              <strong className="text-accent">{tr('서비스 내부 배틀 연동 완료', 'In-app battle integration complete')}</strong><br />
              {tr('종목 분석 데이터는 제작자 API로 전송되고, 받은 예측 결과와 승패·전적은 AI Battle 안에서 표시됩니다.', 'AI Battle sends market analysis to the builder API, then shows the prediction, result, and record entirely inside this service.')}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-black text-white mb-4">{tr('사용 후기 남기기', 'Write a review')}</h2>
          <form onSubmit={submitReview} className="space-y-4">
            <div className="flex gap-2" aria-label="별점">
              {[1, 2, 3, 4, 5].map(value => (
                <Button key={value} type="button" size="sm" variant="ghost" onClick={() => setRating(value)} className={value <= rating ? 'text-yellow-300' : 'text-muted'}>★</Button>
              ))}
            </div>
            <Textarea value={content} onChange={e => setContent(e.target.value)} minLength={10} maxLength={1000} currentLength={content.length} placeholder={tr('직접 사용해본 점, 좋았던 점과 아쉬운 점을 10자 이상 적어주세요.', 'Describe what worked well and what could improve (10+ characters).')} />
            <Button type="submit">{tr('리뷰 저장', 'Save review')}</Button>
          </form>
        </Card>

        <div className="space-y-3">
          <h2 className="text-lg font-black text-white">{tr('리뷰', 'Reviews')} {reviews.length}</h2>
          {reviews.length ? reviews.map(review => (
            <Card key={review.id} className="p-4">
              <div className="flex justify-between gap-3 mb-2">
                <strong className="text-white">{review.nickname}</strong>
                <span className="text-yellow-300 tracking-wider">{'★'.repeat(review.rating)}<span className="text-border">{'★'.repeat(5 - review.rating)}</span></span>
              </div>
              <p className="text-sm text-white/75 leading-6">{review.content}</p>
            </Card>
          )) : <div className="p-8 border border-border rounded-xl text-center text-muted">{tr('첫 리뷰를 남겨주세요.', 'Be the first to review this tool.')}</div>}
        </div>
      </section>
    </main>
  )
}
