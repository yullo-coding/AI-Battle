'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { StockAnalysis } from '@/lib/types'
import type { Battle } from '@/lib/types'
import type { AIPrediction } from '@/lib/claude'
import { loadSession } from '@/lib/storage'
import type { UserSession } from '@/lib/types'
import StockSelector from '@/components/StockSelector'
import DateSelector from '@/components/DateSelector'
import StockInfoPanel from '@/components/StockInfoPanel'
import PercentSlider from '@/components/PercentSlider'
import AIPredictionResult from '@/components/AIPredictionResult'
import EmailAuthModal from '@/components/EmailAuthModal'

type Step = 1 | 2 | 3 | 4 | 5

const AI_STEPS = [
  { label: '데이터 수집 중', detail: 'Yahoo Finance API 호출...' },
  { label: '지표 분석 중', detail: 'RSI · MACD · 볼린저 · MA 계산...' },
  { label: '예측 생성 중', detail: 'Claude Sonnet 4.6 추론 중...' },
]

export default function NewBattlePage() {
  const [step, setStep] = useState<Step>(1)
  const [symbol, setSymbol] = useState('')
  const [endDate, setEndDate] = useState('')
  const [analysis, setAnalysis] = useState<StockAnalysis | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisError, setAnalysisError] = useState('')
  const [userPercent, setUserPercent] = useState(0)
  const [session, setSession] = useState<UserSession | null>(null)
  const [showAuth, setShowAuth] = useState(false)
  const [aiStep, setAiStep] = useState(0)
  const [battle, setBattle] = useState<Battle | null>(null)
  const [aiPrediction, setAiPrediction] = useState<AIPrediction | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [predExpanded, setPredExpanded] = useState(false)

  useEffect(() => {
    setSession(loadSession())
    const handler = () => setSession(loadSession())
    window.addEventListener('session-change', handler)
    return () => window.removeEventListener('session-change', handler)
  }, [])

  // Step 1 → 2: 종목 선택 즉시 백그라운드 fetch 시작
  function handleSelectStock(s: string) {
    setSymbol(s)
    setStep(2)
    setAnalysis(null)
    setAnalysisError('')
    setAnalysisLoading(true)
    fetch(`/api/stocks/${encodeURIComponent(s)}`)
      .then(res => { if (!res.ok) throw new Error(); return res.json() })
      .then(data => { setAnalysis(data); setAnalysisLoading(false) })
      .catch(() => { setAnalysisError('주가 데이터를 불러오지 못했습니다. 다시 시도해주세요.'); setAnalysisLoading(false) })
  }

  // Step 2 → 3: 분석 + 예측 입력 통합 화면
  function handleSelectDate(date: string) {
    setEndDate(date)
    setStep(3)
  }

  async function handleSubmitPrediction() {
    if (!session) {
      setShowAuth(true)
      return
    }
    await submitBattle(session.email)
  }

  async function submitBattle(email: string) {
    setSubmitting(true)
    setSubmitError('')
    setStep(4)
    setAiStep(0)

    const stepTimer1 = setTimeout(() => setAiStep(1), 1200)
    const stepTimer2 = setTimeout(() => setAiStep(2), 2800)

    try {
      const res = await fetch('/api/battle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, symbol, endDate, userChangePercent: userPercent }),
      })

      clearTimeout(stepTimer1)
      clearTimeout(stepTimer2)
      setAiStep(2)

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? '배틀 생성 실패')
      }

      const data = await res.json() as { battle: Battle; aiPrediction: AIPrediction }
      await new Promise(r => setTimeout(r, 600))

      setBattle(data.battle)
      setAiPrediction(data.aiPrediction)
      setStep(5)
    } catch (err: unknown) {
      clearTimeout(stepTimer1)
      clearTimeout(stepTimer2)
      setSubmitError(err instanceof Error ? err.message : String(err))
      setStep(3)
    }
    setSubmitting(false)
  }

  function handleAuth(s: UserSession) {
    setSession(s)
    setShowAuth(false)
    submitBattle(s.email)
  }

  return (
    <main className="min-h-screen bg-bg">
      {showAuth && <EmailAuthModal onAuth={handleAuth} onClose={() => setShowAuth(false)} />}

      {/* Step indicator */}
      <div className="border-b border-border bg-surface/50">
        <div className="max-w-lg mx-auto px-6 py-3 flex justify-end">
          <StepIndicator step={step} />
        </div>
      </div>

      <AnimatePresence mode="wait">

        {/* STEP 1 — 종목 선택 */}
        {step === 1 && (
          <motion.div key="step1" {...fadeSlide} className="max-w-lg mx-auto px-6 py-8">
            <StockSelector onSelect={handleSelectStock} />
          </motion.div>
        )}

        {/* STEP 2 — 날짜 선택 */}
        {step === 2 && (
          <motion.div key="step2" {...fadeSlide} className="max-w-lg mx-auto px-6 py-8">
            <DateSelector
              symbol={symbol}
              onSelect={handleSelectDate}
              onBack={() => setStep(1)}
            />
          </motion.div>
        )}

        {/* STEP 3 — 분석 + 예측 입력 (통합) */}
        {step === 3 && (
          <motion.div key="step3" {...fadeSlide}>
            {analysisLoading ? (
              <div className="max-w-lg mx-auto px-6 py-8">
                <AnalysisLoader />
              </div>
            ) : analysisError ? (
              <div className="max-w-lg mx-auto px-6 py-8">
                <ErrorState message={analysisError} onRetry={() => handleSelectStock(symbol)} />
              </div>
            ) : analysis ? (
              <>
                {/* 분석 정보 스크롤 영역 */}
                <div className="max-w-lg mx-auto px-6 py-6 pb-24">
                  <StockInfoPanel analysis={analysis} endDate={endDate} />
                </div>

                {/* 예측 입력 — sticky 하단 */}
                <div className="fixed bottom-0 left-0 right-0 z-30 bg-bg/95 backdrop-blur-md border-t border-border">
                  <div className="max-w-lg mx-auto px-4">

                    {/* 항상 보이는 컴팩트 바 */}
                    <div
                      className="flex items-center gap-3 py-3 cursor-pointer"
                      onClick={() => setPredExpanded(v => !v)}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-xs font-mono text-muted">내 예측</span>
                        <span className={`text-base font-black font-mono ${
                          userPercent > 0 ? 'text-up' : userPercent < 0 ? 'text-down' : 'text-muted'
                        }`}>
                          {userPercent > 0 ? '+' : ''}{userPercent.toFixed(1)}%
                        </span>
                        <span className="text-xs text-muted/50 font-mono">{endDate}</span>
                      </div>
                      <span className="text-muted text-xs font-mono">
                        {predExpanded ? '▼ 접기' : '▲ 입력'}
                      </span>
                    </div>

                    {/* 확장 시 슬라이더 + 버튼 */}
                    <AnimatePresence>
                      {predExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="pb-4 space-y-3">
                            <PercentSlider value={userPercent} onChange={setUserPercent} />
                            {submitError && (
                              <div className="text-xs text-down font-mono">{submitError}</div>
                            )}
                            <div className="flex gap-2">
                              <button
                                onClick={() => setStep(2)}
                                className="px-3 py-2 border border-border text-muted rounded-lg text-xs font-mono hover:border-white hover:text-white transition-colors"
                              >
                                ← 날짜
                              </button>
                              <button
                                onClick={handleSubmitPrediction}
                                disabled={submitting}
                                className="flex-1 py-2 bg-accent text-bg font-bold rounded-lg hover:bg-accent-dim transition-colors disabled:opacity-50 text-sm"
                              >
                                {submitting ? '제출 중...' : 'AI와 배틀 시작 ⚔️'}
                              </button>
                            </div>
                            {!session && (
                              <p className="text-xs text-muted text-center">제출 시 이메일 인증이 필요합니다.</p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </>
            ) : null}
          </motion.div>
        )}

        {/* STEP 4 — AI 로딩 */}
        {step === 4 && (
          <motion.div key="step4" {...fadeSlide} className="max-w-lg mx-auto px-6 py-8">
            <AILoadingScreen aiStep={aiStep} />
          </motion.div>
        )}

        {/* STEP 5 — 결과 */}
        {step === 5 && battle && aiPrediction && (
          <motion.div key="step5" {...fadeSlide} className="max-w-lg mx-auto px-6 py-8">
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
  return (
    <div className="flex items-center gap-1.5">
      {([1, 2, 3, 4, 5] as Step[]).map(s => (
        <div
          key={s}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            s < step ? 'w-3 bg-accent' : s === step ? 'w-5 bg-accent' : 'w-3 bg-border'
          }`}
        />
      ))}
    </div>
  )
}

function AnalysisLoader() {
  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-6">
      <div className="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      <div className="text-center">
        <div className="tag text-accent mb-2">// 데이터 로딩</div>
        <p className="text-muted text-sm">주가 지표를 불러오는 중...</p>
      </div>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
      <div className="text-4xl">⚠️</div>
      <p className="text-down text-sm">{message}</p>
      <button
        onClick={onRetry}
        className="px-6 py-2 border border-accent text-accent rounded-lg text-sm font-mono hover:bg-accent/10 transition-colors"
      >
        다시 시도
      </button>
    </div>
  )
}

function AILoadingScreen({ aiStep }: { aiStep: number }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-8">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
        className="w-16 h-16 border-2 border-[#7C3AED] border-t-transparent rounded-full"
      />
      <div className="text-center space-y-2">
        <div className="tag text-[#7C3AED] mb-3">// AI_ANALYSIS</div>
        <p className="text-white font-bold text-lg">Claude가 분석 중...</p>
        <p className="text-muted text-sm">잠시만 기다려주세요</p>
      </div>
      <div className="w-full max-w-xs space-y-3">
        {AI_STEPS.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0.3 }}
            animate={{ opacity: i <= aiStep ? 1 : 0.3 }}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
              i < aiStep ? 'border-accent/40 bg-accent/5'
              : i === aiStep ? 'border-[#7C3AED]/40 bg-[#7C3AED]/5'
              : 'border-border bg-surface'
            }`}
          >
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
              i < aiStep ? 'bg-accent' : i === aiStep ? 'bg-[#7C3AED] animate-pulse' : 'bg-border'
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
