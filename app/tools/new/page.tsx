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

const MARKET_OPTIONS = ['US', 'KR', 'EU', 'Crypto', 'FX', 'Global'] as const

export default function NewToolPage() {
  const { locale, tr } = useLocale()
  const router = useRouter()
  const [session, setSession] = useState<UserSession | null>(null)
  const [sessionReady, setSessionReady] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [name, setName] = useState('')
  const [tagline, setTagline] = useState('')
  const [description, setDescription] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [pricing, setPricing] = useState<'free' | 'freemium' | 'paid'>('free')
  const [connectBattleApi, setConnectBattleApi] = useState(false)
  const [supportedMarkets, setSupportedMarkets] = useState<string[]>(['US', 'KR'])
  const [endpointUrl, setEndpointUrl] = useState('')
  const [authToken, setAuthToken] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewMessage, setPreviewMessage] = useState('')
  const [showDetails, setShowDetails] = useState(false)
  const mode = connectBattleApi ? 'api' : 'link'

  useEffect(() => {
    setSession(loadSession())
    setSessionReady(true)
  }, [])

  function toggleMarket(market: string) {
    setSupportedMarkets(current => current.includes(market)
      ? current.filter(item => item !== market)
      : [...current, market])
  }

  function normalizedWebsiteUrl() {
    const value = websiteUrl.trim()
    if (!value) return ''
    return /^https:\/\//i.test(value) ? value : `https://${value}`
  }

  async function previewWebsite() {
    const url = normalizedWebsiteUrl()
    if (!url) {
      setError(tr('웹사이트 링크를 먼저 입력해주세요.', 'Enter the website URL first.'))
      return
    }

    setWebsiteUrl(url)
    setPreviewLoading(true)
    setPreviewMessage('')
    setError('')
    try {
      const response = await fetch('/api/tools/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteUrl: url }),
      })
      const result = await response.json() as { name?: string; tagline?: string; description?: string; logoUrl?: string; error?: string }
      if (!response.ok) throw new Error(result.error ?? tr('사이트 정보를 불러오지 못했습니다.', 'Could not read the website.'))
      if (!name && result.name) setName(result.name)
      if (!tagline && result.tagline) setTagline(result.tagline)
      if (!description && result.description) setDescription(result.description)
      if (result.logoUrl) setLogoUrl(result.logoUrl)
      setPreviewMessage(tr('사이트 정보를 불러왔어요. 내용만 확인해주세요.', 'Website details loaded. Review and adjust them if needed.'))
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : tr('사이트 정보를 불러오지 못했습니다.', 'Could not read the website.'))
    } finally {
      setPreviewLoading(false)
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!session) { setShowAuth(true); return }

    await submitTool(session)
  }

  async function submitTool(currentSession: UserSession) {

    setSubmitting(true)
    setError('')
    setStatus(mode === 'api' ? tr('제작자 API에 테스트 예측을 요청하는 중...', 'Requesting a test prediction from your API...') : tr('도구 정보를 등록하는 중...', 'Submitting your tool...'))
    try {
      const response = await fetch('/api/tools/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: currentSession.email,
          name,
          tagline,
          description,
          websiteUrl: normalizedWebsiteUrl(),
          logoUrl,
          locale,
          pricing,
          connectBattleApi,
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

  function handleAuth(authenticatedSession: UserSession) {
    setSession(authenticatedSession)
    setShowAuth(false)
    void submitTool(authenticatedSession)
  }

  if (!sessionReady) {
    return (
      <main className="min-h-screen bg-bg flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-bg">
      {showAuth && <EmailAuthModal onAuth={handleAuth} onClose={() => setShowAuth(false)} />}
      <section className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8">
          <p className="text-accent font-mono text-sm mb-2">{tr('제작자 등록', 'Builder Submission')}</p>
          <h1 className="text-3xl font-black text-white mb-3">{tr('내 AI 투자 도구 등록하기', 'Submit Your AI Investing Tool')}</h1>
          <p className="text-muted">{tr('링크를 넣으면 기본 정보를 자동으로 채워드려요. 로그인은 마지막 공개 단계에서만 필요합니다.', 'Paste a link and we will fill the basics. Sign-in is only required when you publish.')}</p>
        </div>

        {session ? (
          <Card className="mb-5 p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-black text-accent">
                {session.nickname.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs text-muted">{tr('등록 계정', 'Submitting as')}</div>
                <div className="font-bold text-white truncate">{session.nickname}</div>
                <div className="text-xs text-muted font-mono truncate">{session.email}</div>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="mb-5 border-accent/30 bg-accent/[0.04] p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-lg">✦</div>
              <div>
                <div className="font-bold text-white">{tr('먼저 작성해보세요', 'Start filling it out')}</div>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {tr('작성한 내용은 그대로 유지되고, 공개 버튼을 누를 때 이메일로 로그인합니다.', 'Your work stays in place. You will sign in by email only when you publish.')}
                </p>
              </div>
            </div>
          </Card>
        )}

        <Card>
          <form onSubmit={submit} className="space-y-6">
            <div className="rounded-xl border border-accent/30 bg-accent/[0.04] p-4">
              <div className="mb-1 text-xs font-mono font-bold text-accent">{tr('빠른 등록 · 필수 3개', 'Quick submit · 3 essentials')}</div>
              <p className="text-xs leading-relaxed text-muted">{tr('웹사이트, 도구 이름, 한 줄 소개만 확인하면 등록할 수 있어요.', 'Confirm the website, tool name, and one-line description to publish.')}</p>
            </div>

            <div className="space-y-3">
              <Input
                label={tr('웹사이트 링크', 'Website')}
                value={websiteUrl}
                onChange={e => { setWebsiteUrl(e.target.value); setPreviewMessage('') }}
                onBlur={() => { if (websiteUrl) setWebsiteUrl(normalizedWebsiteUrl()) }}
                type="url"
                required
                placeholder="https://..."
              />
              <Button type="button" variant="secondary" className="w-full" disabled={previewLoading || !websiteUrl.trim()} onClick={previewWebsite}>
                {previewLoading ? tr('사이트 정보 확인 중...', 'Reading website...') : tr('링크에서 이름·소개 자동으로 불러오기', 'Fill name and description from link')} →
              </Button>
              {previewMessage && <p className="text-xs text-accent">✓ {previewMessage}</p>}
              {logoUrl && (
                <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoUrl} alt="" className="h-9 w-9 rounded-lg border border-border bg-white object-contain" />
                  <span className="text-xs text-muted">{tr('사이트 대표 이미지도 함께 불러왔어요.', 'Site image loaded as well.')}</span>
                </div>
              )}
            </div>

            <Input label={tr('도구 이름', 'Tool name')} value={name} onChange={e => setName(e.target.value)} minLength={2} maxLength={60} required placeholder={tr('예: 차트메이트 AI', 'e.g. ChartMate AI')} />
            <Input label={tr('한 줄 소개', 'Tagline')} value={tagline} onChange={e => setTagline(e.target.value)} minLength={5} maxLength={120} required placeholder={tr('누구에게 어떤 도움을 주는 도구인가요?', 'Who is it for, and what does it help them do?')} />
            <div className="rounded-xl border border-border bg-surface-2 p-4">
              <Button type="button" variant="ghost" className="w-full justify-between" onClick={() => setShowDetails(value => !value)} aria-expanded={showDetails}>
                <span>{tr('상세 정보', 'More details')} <span className="text-muted">{tr('(선택)', '(optional)')}</span></span>
                <span>{showDetails ? '−' : '+'}</span>
              </Button>

              {showDetails && (
                <div className="mt-5 space-y-6 border-t border-border pt-5">
                  <Textarea label={tr('상세 설명 (선택)', 'Description (optional)')} value={description} onChange={e => setDescription(e.target.value)} maxLength={2000} currentLength={description.length} placeholder={tr('사용하는 데이터, 분석 방식, 지원 범위와 한계를 적어주세요.', 'Describe data sources, methodology, coverage, and limitations.')} />
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
                </div>
              )}
            </div>

            <div className={`rounded-xl border p-5 transition-colors ${connectBattleApi ? 'border-accent/50 bg-accent/[0.05]' : 'border-border bg-surface-2'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h2 className="text-lg font-black text-white">{tr('배틀 API 연결', 'Connect Battle API')}</h2>
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted">{tr('선택', 'Optional')}</span>
                  </div>
                  <p className="text-sm text-muted leading-relaxed">
                    {tr('연결하면 사용자가 AI Battle 안에서 내 도구와 직접 대결할 수 있습니다.', 'Connect it so users can battle your tool directly inside AI Battle.')}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={connectBattleApi ? 'primary' : 'secondary'}
                  aria-pressed={connectBattleApi}
                  onClick={() => setConnectBattleApi(value => !value)}
                  className="shrink-0"
                >
                  {connectBattleApi ? tr('연결 선택됨 ✓', 'Selected ✓') : tr('연결하기 +', 'Connect +')}
                </Button>
              </div>
            </div>

            {connectBattleApi && (
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
              {connectBattleApi
                ? tr('연결 테스트를 통과한 도구는 AI 서비스 선택 화면에 즉시 나타납니다. API 토큰은 공개 목록이 아닌 서버 전용 공간에 보관됩니다.', 'Verified tools appear in the AI selection screen immediately. API tokens are stored server-side and never exposed in the public directory.')
                : tr('배틀 API 없이도 도구 소개와 리뷰 페이지는 바로 공개됩니다. 배틀 기능만 비활성 상태로 등록됩니다.', 'Your tool profile and reviews go live without a Battle API. Only battle participation remains disabled.')}
            </div>
            {status && <p className="text-accent text-sm">{status}</p>}
            {error && <p className="text-danger text-sm">{error}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={submitting || supportedMarkets.length === 0}>
              {submitting
                ? (connectBattleApi ? tr('API 연결 테스트 중...', 'Testing API connection...') : tr('등록 중...', 'Submitting...'))
                : !session
                  ? tr('이메일 로그인 후 무료 공개', 'Sign in and publish for free')
                  : (connectBattleApi ? tr('API 테스트하고 도구 등록', 'Test API & Submit Tool') : tr('AI 투자 도구 등록', 'Submit AI Investing Tool'))}
            </Button>
            {!session && (
              <p className="text-center text-[11px] text-muted">{tr('작성한 내용은 로그인 화면을 열어도 사라지지 않습니다.', 'Your entries stay in place while you sign in.')}</p>
            )}
          </form>
        </Card>
      </section>
    </main>
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
