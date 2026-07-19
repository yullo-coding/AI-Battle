'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { StockAnalysis, StockChoice } from '@/lib/types'
import type { Battle } from '@/lib/types'
import type { AIPrediction } from '@/lib/claude'
import { getAuthHeaders, loadSession, restoreAuthenticatedSession } from '@/lib/storage'
import type { UserSession } from '@/lib/types'
import StockSelector from '@/components/StockSelector'
import DateSelector from '@/components/DateSelector'
import StockInfoPanel from '@/components/StockInfoPanel'
import PredictionComposer from '@/components/PredictionComposer'
import AIPredictionResult from '@/components/AIPredictionResult'
import EmailAuthModal from '@/components/EmailAuthModal'
import AIToolSelector from '@/components/AIToolSelector'
import { DEFAULT_AI_TOOL, DEFAULT_TOOL_ID, fetchAITools, localizedTool } from '@/lib/aiTools'
import type { AITool } from '@/lib/types'
import Button from '@vibe/design-system/components/ui/Button'
import { useLocale } from '@/components/LocaleProvider'

type Step = 1 | 2 | 3 | 4 | 5 | 6
const PENDING_BATTLE_KEY = 'ai_battle_pending_submission'

function browserStorage() {
  try {
    return window.localStorage ?? null
  } catch {
    return null
  }
}

export default function NewBattlePage() {
  const { locale, tr } = useLocale()
  const [step, setStep] = useState<Step>(1)
  const [symbol, setSymbol] = useState('')
  const [selectedStock, setSelectedStock] = useState<StockChoice | null>(null)
  const [endDate, setEndDate] = useState('')
  const [analysis, setAnalysis] = useState<StockAnalysis | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisError, setAnalysisError] = useState('')
  const [userPercent, setUserPercent] = useState(0)
  const [session, setSession] = useState<UserSession | null>(null)
  const [sessionReady, setSessionReady] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [aiStep, setAiStep] = useState(0)
  const [battle, setBattle] = useState<Battle | null>(null)
  const [aiPrediction, setAiPrediction] = useState<AIPrediction | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [predExpanded, setPredExpanded] = useState(true)
  const [currency, setCurrency] = useState<'KRW' | 'USD'>('KRW')
  const [aiTools, setAiTools] = useState<AITool[]>([])
  const [selectedToolId, setSelectedToolId] = useState(DEFAULT_TOOL_ID)
  const [resumeAfterAuth, setResumeAfterAuth] = useState(false)
  const selectedTool = aiTools.find(tool => tool.id === selectedToolId) ?? DEFAULT_AI_TOOL
  const selectedToolCopy = localizedTool(selectedTool, locale)

  useEffect(() => {
    const storage = browserStorage()
    try {
      const rawDraft = storage?.getItem(PENDING_BATTLE_KEY)
      if (rawDraft) {
        const draft = JSON.parse(rawDraft) as {
          savedAt: number
          symbol: string
          selectedStock: StockChoice
          endDate: string
          userPercent: number
          selectedToolId: string
          currency: 'KRW' | 'USD'
        }
        if (Date.now() - draft.savedAt < 60 * 60 * 1000 && draft.symbol && draft.endDate) {
          setSymbol(draft.symbol)
          setSelectedStock(draft.selectedStock)
          setEndDate(draft.endDate)
          setUserPercent(draft.userPercent)
          setSelectedToolId(draft.selectedToolId)
          setCurrency(draft.currency)
          setStep(4)
          setAnalysisLoading(true)
          setResumeAfterAuth(true)
          fetch(`/api/stocks/${encodeURIComponent(draft.symbol)}`)
            .then(response => { if (!response.ok) throw new Error(); return response.json() })
            .then(data => { setAnalysis(data); setAnalysisLoading(false) })
            .catch(() => { setAnalysisError(tr('주가 데이터를 불러오지 못했습니다. 다시 시도해주세요.', 'Could not load market data. Please try again.')); setAnalysisLoading(false) })
        } else {
          storage?.removeItem(PENDING_BATTLE_KEY)
        }
      }
    } catch {
      storage?.removeItem(PENDING_BATTLE_KEY)
    }

    setSession(loadSession())
    setSessionReady(true)
    void restoreAuthenticatedSession().then(restored => {
      setSession(restored)
      setSessionReady(true)
    })
    const handler = () => {
      setSession(loadSession())
      setSessionReady(true)
    }
    window.addEventListener('session-change', handler)
    window.addEventListener('storage', handler)
    return () => {
      window.removeEventListener('session-change', handler)
      window.removeEventListener('storage', handler)
    }
    // 최초 진입에서만 초안을 복원하며 언어 변경으로 재제출하지 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!resumeAfterAuth || !session || analysisLoading || !analysis) return
    setResumeAfterAuth(false)
    void submitBattle()
    // submitBattle은 최신 화면 상태를 사용하며, 재인증 복귀 시 한 번만 호출한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeAfterAuth, session, analysisLoading, analysis])

  useEffect(() => {
    fetchAITools()
      .then(tools => {
        setAiTools(tools)
        const requestedToolId = new URLSearchParams(window.location.search).get('tool')
        const requestedTool = tools.find(tool => tool.id === requestedToolId)
        if (requestedTool && (requestedTool.integration_type === 'built_in' || (requestedTool.integration_type === 'api' && requestedTool.verification_status === 'verified'))) {
          setSelectedToolId(requestedTool.id)
        }
      })
      .catch(() => setAiTools([]))
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step])

  // Step 2 → 3: 종목 선택 즉시 분석 데이터를 미리 불러온다.
  function handleSelectStock(stock: StockChoice) {
    const s = stock.symbol
    setSelectedStock(stock)
    setSymbol(s)
    setStep(3)
    setAnalysis(null)
    setAnalysisError('')
    setAnalysisLoading(true)
    fetch(`/api/stocks/${encodeURIComponent(s)}`)
      .then(res => { if (!res.ok) throw new Error(); return res.json() })
      .then(data => { setAnalysis(data); setAnalysisLoading(false) })
      .catch(() => { setAnalysisError(tr('주가 데이터를 불러오지 못했습니다. 다시 시도해주세요.', 'Could not load market data. Please try again.')); setAnalysisLoading(false) })
  }

  // Step 3 → 4: 결과일 선택 시 최신 분석 데이터로 한 번 더 갱신한다.
  function handleSelectDate(date: string) {
    setEndDate(date)
    setStep(4)
    setPredExpanded(true)
    setAnalysisLoading(true)
    setAnalysisError('')
    fetch(`/api/stocks/${encodeURIComponent(symbol)}`)
      .then(res => { if (!res.ok) throw new Error(); return res.json() })
      .then(data => { setAnalysis(data); setAnalysisLoading(false) })
      .catch(() => { setAnalysisError(tr('주가 데이터를 불러오지 못했습니다. 다시 시도해주세요.', 'Could not load market data. Please try again.')); setAnalysisLoading(false) })
  }

  async function handleSubmitPrediction() {
    if (!session) {
      browserStorage()?.setItem(PENDING_BATTLE_KEY, JSON.stringify({
        savedAt: Date.now(), symbol, selectedStock, endDate, userPercent, selectedToolId, currency,
      }))
      setShowAuth(true)
      return
    }
    await submitBattle()
  }

  async function submitBattle() {
    browserStorage()?.removeItem(PENDING_BATTLE_KEY)
    setSubmitting(true)
    setSubmitError('')
    setStep(5)
    setAiStep(0)

    const stepTimer1 = setTimeout(() => setAiStep(1), 1200)
    const stepTimer2 = setTimeout(() => setAiStep(2), 2800)

    try {
      const authHeaders = await getAuthHeaders()
      const res = await fetch('/api/battle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          symbol, endDate, userChangePercent: userPercent,
          aiToolId: selectedToolId,
        }),
      })

      clearTimeout(stepTimer1)
      clearTimeout(stepTimer2)
      setAiStep(2)

      if (!res.ok) {
        const err = await res.json()
        throw new Error(locale === 'en' ? 'Could not create the battle. Check the selected AI connection.' : (err.error ?? '배틀 생성 실패'))
      }

      const data = await res.json() as { battle: Battle; aiPrediction: AIPrediction }
      await new Promise(r => setTimeout(r, 600))

      setBattle(data.battle)
      setAiPrediction(data.aiPrediction)
      setStep(6)
    } catch (err: unknown) {
      clearTimeout(stepTimer1)
      clearTimeout(stepTimer2)
      setSubmitError(err instanceof Error ? err.message : String(err))
      setStep(4)
    }
    setSubmitting(false)
  }

  function handleAuth(s: UserSession) {
    setSession(s)
    setShowAuth(false)
    void submitBattle()
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

      {/* Step indicator */}
      <div className="border-b border-border bg-surface/50">
        <div className="max-w-6xl mx-auto px-6 py-3 flex justify-end">
          <StepIndicator step={step} />
        </div>
      </div>

      <AnimatePresence mode="wait">

        {/* STEP 1 — AI 투자 서비스 선택 */}
        {step === 1 && (
          <motion.div key="step1" {...fadeSlide} className="max-w-3xl mx-auto px-6 py-8">
            <AIToolSelector
              tools={aiTools.length ? aiTools : [DEFAULT_AI_TOOL]}
              value={selectedToolId}
              onChange={setSelectedToolId}
              onContinue={() => setStep(2)}
            />
          </motion.div>
        )}

        {/* STEP 2 — 종목 선택 */}
        {step === 2 && (
          <motion.div key="step2" {...fadeSlide} className="max-w-3xl mx-auto px-6 py-8">
            <StockSelector onSelect={handleSelectStock} onBack={() => setStep(1)} />
          </motion.div>
        )}

        {/* STEP 3 — 결과 확인일 선택 */}
        {step === 3 && (
          <motion.div key="step3" {...fadeSlide} className="max-w-2xl mx-auto px-6 py-8">
            {selectedStock && <DateSelector
              stock={selectedStock}
              onSelect={handleSelectDate}
              onBack={() => setStep(2)}
            />}
          </motion.div>
        )}

        {/* STEP 4 — 분석 + 예측 입력 (통합) */}
        {step === 4 && (
          <motion.div key="step4" {...fadeSlide}>
            {analysisLoading ? (
              <div className="max-w-lg mx-auto px-6 py-8">
                <AnalysisLoader />
              </div>
            ) : analysisError ? (
              <div className="max-w-lg mx-auto px-6 py-8">
                <ErrorState message={analysisError} onRetry={() => handleSelectDate(endDate)} />
              </div>
            ) : analysis ? (
              <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                <div className="mb-6">
                  <div className="text-xs font-mono text-accent mb-2">{tr('분석 확인 · 예측 입력', 'Review analysis · Enter prediction')}</div>
                  <h1 className="text-2xl sm:text-3xl font-black text-white">{tr('근거를 확인하고 내 예측을 정하세요', 'Review the evidence and make your call')}</h1>
                  <p className="text-sm text-muted mt-2 leading-relaxed">
                    {tr('핵심 신호를 먼저 보고 예측을 입력한 뒤, 아래 상세 지표로 판단을 보완하세요.', 'Start with the key signals, enter your prediction, then use the detailed evidence below to refine it.')}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-4 text-xs">
                    <span className="rounded-full border border-border bg-surface px-3 py-1.5 text-muted">
                      {tr('상대 AI', 'AI opponent')} <strong className="text-[#C4B5FD] ml-1">{selectedToolCopy.name}</strong>
                    </span>
                    <span className="rounded-full border border-border bg-surface px-3 py-1.5 text-muted">
                      {tr('판정일', 'Settlement')} <strong className="text-white font-mono ml-1">{endDate}</strong>
                    </span>
                  </div>
                </div>

                <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
                  <StockInfoPanel
                    analysis={analysis}
                    endDate={endDate}
                    predictionSlot={(
                      <div className="lg:hidden">
                        <PredictionComposer
                          analysis={analysis}
                          endDate={endDate}
                          toolName={selectedToolCopy.name}
                          value={userPercent}
                          onChange={setUserPercent}
                          currency={currency}
                          onCurrencyChange={setCurrency}
                          expanded={predExpanded}
                          onToggle={() => setPredExpanded(v => !v)}
                          submitting={submitting}
                          submitError={submitError}
                          signedIn={Boolean(session)}
                          onBack={() => setStep(3)}
                          onSubmit={handleSubmitPrediction}
                        />
                      </div>
                    )}
                  />

                  <aside className="hidden lg:block lg:sticky lg:top-24">
                    <PredictionComposer
                      analysis={analysis}
                      endDate={endDate}
                      toolName={selectedToolCopy.name}
                      value={userPercent}
                      onChange={setUserPercent}
                      currency={currency}
                      onCurrencyChange={setCurrency}
                      expanded
                      onToggle={() => undefined}
                      alwaysExpanded
                      submitting={submitting}
                      submitError={submitError}
                      signedIn={Boolean(session)}
                      onBack={() => setStep(3)}
                      onSubmit={handleSubmitPrediction}
                    />
                  </aside>
                </div>
              </div>
            ) : null}
          </motion.div>
        )}

        {/* STEP 5 — AI 로딩 */}
        {step === 5 && (
          <motion.div key="step5" {...fadeSlide} className="max-w-lg mx-auto px-6 py-8">
            <AILoadingScreen aiStep={aiStep} toolName={selectedToolCopy.name} />
          </motion.div>
        )}

        {/* STEP 6 — 결과 */}
        {step === 6 && battle && aiPrediction && (
          <motion.div key="step6" {...fadeSlide} className="max-w-lg mx-auto px-6 py-8">
            <AIPredictionResult battle={battle} aiPrediction={aiPrediction} />
          </motion.div>
        )}

      </AnimatePresence>
    </main>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────

const fadeSlide = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2 },
}

function StepIndicator({ step }: { step: Step }) {
  const { tr } = useLocale()
  const labels = [
    tr('AI 선택', 'Choose AI'),
    tr('종목 선택', 'Choose stock'),
    tr('날짜 선택', 'Choose date'),
    tr('분석·예측', 'Analyze & predict'),
    tr('AI 분석', 'AI analysis'),
    tr('완료', 'Done'),
  ]
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted"><strong className="text-white font-mono">{step}/6</strong> · {labels[step - 1]}</span>
      <div className="flex items-center gap-1.5">
        {([1, 2, 3, 4, 5, 6] as Step[]).map(s => (
          <div
            key={s}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              s < step ? 'w-3 bg-accent' : s === step ? 'w-5 bg-accent' : 'w-3 bg-border'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

function AnalysisLoader() {
  const { tr } = useLocale()
  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-6">
      <div className="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      <div className="text-center">
        <div className="tag text-accent mb-2">{tr('데이터 로딩', 'Loading data')}</div>
        <p className="text-muted text-sm">{tr('주가 지표를 불러오는 중...', 'Loading stock indicators...')}</p>
      </div>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { tr } = useLocale()
  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
      <div className="text-4xl">⚠️</div>
      <p className="text-down text-sm">{message}</p>
      <Button variant="secondary" onClick={onRetry}>{tr('다시 시도', 'Try again')}</Button>
    </div>
  )
}

function AILoadingScreen({ aiStep, toolName }: { aiStep: number; toolName: string }) {
  const { tr } = useLocale()
  const steps = [
    { label: tr('데이터 수집 중', 'Collecting data'), detail: tr('최신 시세와 시장 데이터 확인...', 'Checking latest prices and market data...') },
    { label: tr('지표 분석 중', 'Analyzing indicators'), detail: tr('RSI · MACD · 볼린저 · 이동평균선 계산...', 'Calculating RSI, MACD, Bollinger Bands, and moving averages...') },
    { label: tr('예측 생성 중', 'Generating prediction'), detail: tr(`${toolName}에 예측 요청 중...`, `Requesting a prediction from ${toolName}...`) },
  ]
  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-8">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
        className="w-16 h-16 border-2 border-[#A78BFA] border-t-transparent rounded-full"
      />
      <div className="text-center space-y-2">
        <div className="tag text-[#A78BFA] mb-3">{tr('AI 분석', 'AI Analysis')}</div>
        <p className="text-white font-bold text-lg">{tr(`${toolName} 분석 중...`, `${toolName} is analyzing...`)}</p>
        <p className="text-muted text-sm">{tr('잠시만 기다려주세요', 'This may take a few seconds')}</p>
      </div>
      <div className="w-full max-w-xs space-y-3">
        {steps.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0.3 }}
            animate={{ opacity: i <= aiStep ? 1 : 0.3 }}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
              i < aiStep ? 'border-accent/40 bg-accent/5'
              : i === aiStep ? 'border-[#A78BFA]/40 bg-[#A78BFA]/5'
              : 'border-border bg-surface'
            }`}
          >
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
              i < aiStep ? 'bg-accent' : i === aiStep ? 'bg-[#A78BFA] animate-pulse' : 'bg-border'
            }`} />
            <div>
              <div className={`text-sm font-bold ${
                i < aiStep ? 'text-accent' : i === aiStep ? 'text-white' : 'text-muted'
              }`}>
                {i < aiStep ? '✓ ' : ''}{s.label}
              </div>
              <div className="text-xs text-muted">{s.detail}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
