'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@vibe/design-system/components/ui/Button'
import Card from '@vibe/design-system/components/ui/Card'
import Input from '@vibe/design-system/components/ui/Input'
import Textarea from '@vibe/design-system/components/ui/Textarea'
import { getSupabase } from '@/lib/supabase'
import { loadSession } from '@/lib/storage'
import type { UserSession } from '@/lib/types'
import EmailAuthModal from '@/components/EmailAuthModal'

export default function NewToolPage() {
  const router = useRouter()
  const [session, setSession] = useState<UserSession | null>(null)
  const [showAuth, setShowAuth] = useState(false)
  const [name, setName] = useState('')
  const [tagline, setTagline] = useState('')
  const [description, setDescription] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [pricing, setPricing] = useState<'free' | 'freemium' | 'paid'>('free')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => setSession(loadSession()), [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!session) { setShowAuth(true); return }
    let url: URL
    try { url = new URL(websiteUrl) } catch { setError('올바른 웹사이트 주소를 입력해주세요.'); return }
    if (url.protocol !== 'https:') { setError('안전을 위해 HTTPS 링크만 등록할 수 있습니다.'); return }

    const sb = getSupabase()
    if (!sb) return
    setSubmitting(true)
    setError('')
    const { data, error: insertError } = await sb.from('ai_tools').insert({
      owner_email: session.email,
      name: name.trim(),
      tagline: tagline.trim(),
      description: description.trim(),
      website_url: url.toString(),
      supported_markets: ['US', 'KR'],
      pricing,
      integration_type: 'link',
      verification_status: 'pending',
    }).select('id').single()
    setSubmitting(false)
    if (insertError || !data) { setError('등록하지 못했습니다. 입력 내용을 확인해주세요.'); return }
    router.push(`/tools/${data.id}`)
  }

  return (
    <main className="min-h-screen bg-bg">
      {showAuth && <EmailAuthModal onAuth={s => { setSession(s); setShowAuth(false) }} onClose={() => setShowAuth(false)} />}
      <section className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-8">
          <p className="text-accent font-mono text-sm mb-2">제작자 등록</p>
          <h1 className="text-3xl font-black text-white mb-3">내 AI 투자 도구 알리기</h1>
          <p className="text-muted">먼저 소개 링크와 설명을 공개합니다. 자동 배틀 API 연동은 별도 검증 후 열립니다.</p>
        </div>

        <Card>
          <form onSubmit={submit} className="space-y-5">
            <Input label="도구 이름" value={name} onChange={e => setName(e.target.value)} minLength={2} maxLength={60} required placeholder="예: 차트메이트 AI" />
            <Input label="한 줄 소개" value={tagline} onChange={e => setTagline(e.target.value)} minLength={5} maxLength={120} required placeholder="누구에게 어떤 도움을 주는 도구인가요?" />
            <Textarea label="상세 설명" value={description} onChange={e => setDescription(e.target.value)} minLength={20} maxLength={2000} required currentLength={description.length} placeholder="사용하는 데이터, 분석 방식, 지원 범위와 한계를 적어주세요." />
            <Input label="웹사이트 링크" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} type="url" required placeholder="https://..." />

            <div>
              <div className="text-xs text-muted font-mono tracking-widest uppercase mb-2">가격 정책</div>
              <div className="grid grid-cols-3 gap-2">
                {([['free', '무료'], ['freemium', '부분 무료'], ['paid', '유료']] as const).map(([value, label]) => (
                  <label key={value} className={`p-3 border rounded-lg cursor-pointer text-center text-sm ${pricing === value ? 'border-accent bg-accent/10 text-accent' : 'border-border text-muted'}`}>
                    <input type="radio" className="sr-only" checked={pricing === value} onChange={() => setPricing(value)} />{label}
                  </label>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-lg border border-border bg-white/[0.03] text-xs text-muted leading-relaxed">
              등록 후 링크·리뷰 전용으로 바로 공개됩니다. 배틀 가능 배지는 표준 API와 보안 검증을 통과한 도구에만 표시됩니다.
            </div>
            {error && <p className="text-danger text-sm">{error}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={submitting}>{submitting ? '등록 중...' : '도구 등록하기'}</Button>
          </form>
        </Card>
      </section>
    </main>
  )
}
