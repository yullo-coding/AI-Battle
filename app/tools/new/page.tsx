'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@vibe/design-system/components/ui/Button'
import Card from '@vibe/design-system/components/ui/Card'
import Input from '@vibe/design-system/components/ui/Input'
import Textarea from '@vibe/design-system/components/ui/Textarea'
import { loadSession } from '@/lib/storage'
import type { UserSession } from '@/lib/types'
import EmailAuthModal from '@/components/EmailAuthModal'
import { useLocale } from '@/components/LocaleProvider'

type RegistrationMode = 'link' | 'api'
const MARKET_OPTIONS = ['US', 'KR', 'EU', 'Crypto', 'FX', 'Global'] as const

export default function NewToolPage() {
  const { locale, tr } = useLocale()
  const router = useRouter()
  const [session, setSession] = useState<UserSession | null>(null)
  const [showAuth, setShowAuth] = useState(false)
  const [name, setName] = useState('')
  const [tagline, setTagline] = useState('')
  const [description, setDescription] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [pricing, setPricing] = useState<'free' | 'freemium' | 'paid'>('free')
  const [mode, setMode] = useState<RegistrationMode>('link')
  const [supportedMarkets, setSupportedMarkets] = useState<string[]>(['US', 'KR'])
  const [endpointUrl, setEndpointUrl] = useState('')
  const [authToken, setAuthToken] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  useEffect(() => setSession(loadSession()), [])

  function toggleMarket(market: string) {
    setSupportedMarkets(current => current.includes(market)
      ? current.filter(item => item !== market)
      : [...current, market])
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!session) { setShowAuth(true); return }

    setSubmitting(true)
    setError('')
    setStatus(mode === 'api' ? tr('제작자 API에 테스트 예측을 요청하는 중...', 'Requesting a test prediction from your API...') : tr('도구 정보를 등록하는 중...', 'Submitting your tool...'))
    try {
      const response = await fetch('/api/tools/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: session.email,
          name,
          tagline,
          description,
          websiteUrl,
          pricing,
          mode,
          supportedMarkets,
          endpointUrl,
          authToken,
        }),
      })
      const result = await response.json() as { toolId?: string; error?: string; message?: string }
      if (!response.ok || !result.toolId) throw new Error(locale === 'en' ? 'Registration or API verification failed.' : (result.error ?? '등록하지 못했습니다.'))
      setStatus(mode === 'api' ? tr('API 검증 완료 — 바로 배틀할 수 있습니다.', 'API verified — your tool is battle ready.') : tr('링크·리뷰 도구가 등록되었습니다.', 'Your review listing is live.'))
      router.push(`/tools/${result.toolId}`)
    } catch (submitError) {
      setStatus('')
      setError(submitError instanceof Error ? submitError.message : tr('등록하지 못했습니다.', 'Could not submit the tool.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-bg">
      {showAuth && <EmailAuthModal onAuth={s => { setSession(s); setShowAuth(false) }} onClose={() => setShowAuth(false)} />}
      <section className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8">
          <p className="text-accent font-mono text-sm mb-2">{tr('제작자 등록', 'Builder Submission')}</p>
          <h1 className="text-3xl font-black text-white mb-3">{tr('내 AI 투자 도구 연결하기', 'Connect Your AI Investing Tool')}</h1>
          <p className="text-muted">{tr('링크만 공개하거나, 예측 API를 연결해 사용자가 AI Battle 안에서 바로 대결하게 할 수 있습니다.', 'Publish a review listing, or connect a prediction API so users can battle your AI without leaving AI Battle.')}</p>
        </div>

        <Card className="mb-5">
          <h2 className="text-lg font-black text-white mb-4">{tr('등록 방식', 'Submission type')}</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <ModeCard selected={mode === 'link'} title={tr('링크·리뷰 등록', 'Review listing')} description={tr('소개 페이지와 사용자 리뷰부터 공개합니다.', 'Publish a profile and collect user reviews first.')} badge={tr('API 불필요', 'No API')} onClick={() => setMode('link')} />
            <ModeCard selected={mode === 'api'} title={tr('배틀 API 연결', 'Connect Battle API')} description={tr('내 AI가 예측하고 승패·전적은 AI Battle에서 관리합니다.', 'Your AI predicts while AI Battle manages results and records.')} badge={tr('바로 배틀 가능', 'Battle ready')} onClick={() => setMode('api')} />
          </div>
        </Card>

        <Card>
          <form onSubmit={submit} className="space-y-6">
            <Input label={tr('도구 이름', 'Tool name')} value={name} onChange={e => setName(e.target.value)} minLength={2} maxLength={60} required placeholder={tr('예: 차트메이트 AI', 'e.g. ChartMate AI')} />
            <Input label={tr('한 줄 소개', 'Tagline')} value={tagline} onChange={e => setTagline(e.target.value)} minLength={5} maxLength={120} required placeholder={tr('누구에게 어떤 도움을 주는 도구인가요?', 'Who is it for, and what does it help them do?')} />
            <Textarea label={tr('상세 설명', 'Description')} value={description} onChange={e => setDescription(e.target.value)} minLength={20} maxLength={2000} required currentLength={description.length} placeholder={tr('사용하는 데이터, 분석 방식, 지원 범위와 한계를 적어주세요.', 'Describe data sources, methodology, coverage, and limitations.')} />
            <Input label={tr('웹사이트 링크', 'Website')} value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} type="url" required placeholder="https://..." />

            <ChoiceGroup label={tr('가격 정책', 'Pricing')} options={[['free', tr('무료', 'Free')], ['freemium', tr('부분 무료', 'Freemium')], ['paid', tr('유료', 'Paid')]]} value={pricing} onChange={value => setPricing(value as typeof pricing)} />

            <div>
              <div className="text-xs text-muted font-mono tracking-widest uppercase mb-2">{tr('지원 시장', 'Supported markets')}</div>
              <div className="flex flex-wrap gap-2">
                {MARKET_OPTIONS.map(market => (
                  <Button key={market} type="button" size="sm" variant={supportedMarkets.includes(market) ? 'primary' : 'secondary'} onClick={() => toggleMarket(market)}>
                    {market}
                  </Button>
                ))}
              </div>
            </div>

            {mode === 'api' && (
              <div className="space-y-5 rounded-xl border border-accent/40 bg-accent/[0.04] p-5">
                <div>
                  <h2 className="text-lg font-black text-white">{tr('예측 API 연결', 'Prediction API')}</h2>
                  <p className="text-sm text-muted mt-1">{tr('AI Battle이 시장 분석 데이터를 보내면 제작자 API가 예측 JSON을 돌려줍니다.', 'AI Battle sends market analysis data, and your API returns a prediction JSON response.')}</p>
                </div>
                <Input label={tr('예측 API 주소', 'Prediction API URL')} value={endpointUrl} onChange={e => setEndpointUrl(e.target.value)} type="url" required placeholder="https://your-service.com/api/predict" />
                <Input label={tr('Bearer 인증 토큰 (선택)', 'Bearer token (optional)')} value={authToken} onChange={e => setAuthToken(e.target.value)} type="password" autoComplete="off" placeholder={tr('API가 인증을 요구할 때만 입력', 'Only if your API requires authentication')} />

                <details className="rounded-lg border border-border bg-bg/60 p-4">
                  <summary className="cursor-pointer text-sm font-bold text-white">{tr('API 요청·응답 형식 보기', 'View API request and response format')}</summary>
                  <div className="mt-4 space-y-4 text-xs leading-relaxed text-muted">
                    <p>{tr('POST 요청에는 종목, 결과일, 현재가와 RSI·MACD·볼린저·이동평균선·시장 심리가 JSON으로 전달됩니다. 사용자 예측값과 개인정보는 보내지 않습니다.', 'The POST request includes the stock, target date, current price, RSI, MACD, Bollinger Bands, moving averages, and market sentiment. User predictions and personal data are never sent.')}</p>
                    <pre className="overflow-x-auto rounded-lg bg-black/50 p-3 text-[11px] text-white/80">{RESPONSE_EXAMPLE}</pre>
                    <p>{tr('12초 안에 위 응답을 반환해야 합니다. 등록 시 테스트 예측을 통과하면 즉시 ‘배틀 가능’ 상태가 됩니다.', 'Return this response within 12 seconds. Passing the test prediction makes your tool battle ready immediately.')}</p>
                    <p className="text-accent">{tr('예시 엔드포인트 경로', 'Example endpoint path')}: /api/tools/example-predict</p>
                  </div>
                </details>
              </div>
            )}

            <div className="p-4 rounded-xl border border-border bg-white/[0.03] text-xs text-muted leading-relaxed">
              {mode === 'api'
                ? tr('연결 테스트를 통과한 도구는 AI 서비스 선택 화면에 즉시 나타납니다. API 토큰은 공개 목록이 아닌 서버 전용 공간에 보관됩니다.', 'Verified tools appear in the AI selection screen immediately. API tokens are stored server-side and never exposed in the public directory.')
                : tr('등록 후 링크·리뷰 전용으로 바로 공개됩니다. 나중에 제작자 API를 연결하면 배틀 도구로 전환할 수 있습니다.', 'Your review listing goes live immediately. You can connect a prediction API later to enable battles.')}
            </div>
            {status && <p className="text-accent text-sm">{status}</p>}
            {error && <p className="text-danger text-sm">{error}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={submitting || supportedMarkets.length === 0}>
              {submitting
                ? (mode === 'api' ? tr('API 연결 테스트 중...', 'Testing API connection...') : tr('등록 중...', 'Submitting...'))
                : (mode === 'api' ? tr('연결 테스트 후 배틀 도구 등록', 'Test & Submit Battle Tool') : tr('링크·리뷰 도구 등록', 'Submit Review Listing'))}
            </Button>
          </form>
        </Card>
      </section>
    </main>
  )
}

function ModeCard({ selected, title, description, badge, onClick }: { selected: boolean; title: string; description: string; badge: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`w-full rounded-xl border p-4 text-left transition-colors ${selected ? 'border-accent bg-accent/[0.08]' : 'border-border bg-surface-2 hover:border-white/60'}`}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <strong className={selected ? 'text-accent' : 'text-white'}>{title}</strong>
        <span className="text-[10px] font-mono text-muted">{badge}</span>
      </div>
      <p className="text-xs leading-relaxed text-muted">{description}</p>
    </button>
  )
}

function ChoiceGroup({ label, options, value, onChange }: { label: string; options: Array<[string, string]>; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <div className="text-xs text-muted font-mono tracking-widest uppercase mb-2">{label}</div>
      <div className="grid grid-cols-3 gap-2">
        {options.map(([option, optionLabel]) => (
          <Button key={option} type="button" variant={value === option ? 'primary' : 'secondary'} onClick={() => onChange(option)}>
            {optionLabel}
          </Button>
        ))}
      </div>
    </div>
  )
}

const RESPONSE_EXAMPLE = `{
  "change_percent": 2.4,
  "confidence": 76,
  "brief": "상승 모멘텀 우세",
  "reasoning": {
    "technical": "기술적 지표 분석",
    "sentiment": "뉴스와 시장 심리 분석",
    "risk": "주요 위험 요인",
    "conclusion": "최종 판단"
  }
}`
