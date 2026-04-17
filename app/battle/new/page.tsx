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
import PhoneAuthModal from '@/components/PhoneAuthModal'

type Step = 1 | 2 | 3 | 4 | 5 | 6

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

  useEffect(() => {
    setSession(loadSession())
  }, [])

  // Step 1 → 2
  function handleSelectStock(sym: string) {
    setSymbol(sym)
    setStep(2)
  }

  // Step 2 → 3 (load analysis)
  async function handleSelectDate(date: string) {
    setEndDate(date)
    setStep(3)
    setAnalysisLoading(true)
    setAnalysisError('')
    try {
      const res = await fetch(`/api/stocks/${sym(symbol)}`)
      if (!res.ok) throw new Error('데이터 조회 실패')
      const data = await res.json()
      setAnalysis(data.analysis)
    } catch {
      setAnalysisError('주가 데이터를 불러오지 못했습니다. 다시 시도해주세요.')
    }
    setAnalysisLoading(false)
  }

  // Step 3 → 4
  function handleAnalysisDone() {
    setStep(4)
  }

  // Step 4 → 5 (submit)
  async function handleSubmitPrediction() {
    if (!session) {
      setShowAuth(true)
      return
    }
    await submitBattle(session.phone)
  }

  async function submitBattle(phone: string) {
    setSubmitting(true)
    setSubmitError('')
    setStep(5)
    setAiStep(0)

    // Simulate AI step progression
    const stepTimer1 = setTimeout(() => setAiStep(1), 1200)
    const stepTimer2 = setTimeout(() => setAiStep(2), 2800)

    try {
      const res = await fetch('/api/battle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          symbol,
          endDate,
          userChangePercent: userPercent,
        }),
      })

      clearTimeout(stepTimer1)
      clearTimeout(stepTimer2)
      setAiStep(2)

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? '배틀 생성 실패')
      }

      const data = await res.json() as { battle: Battle; aiPrediction: AIPrediction }

      // Brief pause so step 3 appears complete
      await new Promise(r => setTimeout(r, 600))

      setBattle(data.battle)
      setAiPrediction(data.aiPrediction)
      setStep(6)
    } catch (err: unknown) {
      clearTimeout(stepTimer1)
      clearTimeout(stepTimer2)
      const msg = err instanceof Error ? err.message : String(err)
      setSubmitError(msg)
      setStep(4)
    }
    setSubmitting(false)
  }

  function handleAuth(s: UserSession) {
    setSession(s)
    setShowAuth(false)
    submitBattle(s.phone)
  }

  return (
    <main className="min-h-screen bg-bg">
      {showAuth && <PhoneAuthModal onAuth={handleAuth} />}

      {/* Nav */}
      <div className="border-b border-border bg-surface/50 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="text-muted text-xs font-mono hover:text-white transition-colors">
            ← AI BATTLE
          </a>
          <StepIndicator step={step} />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {/* STEP 1 — 종목 선택 */}
          {step === 1 && (
            <motion.div key="step1" {...fadeSlide}>
              <StockSelector onSelect={handleSelectStock} />
            </motion.div>
          )}

          {/* STEP 2 — 날짜 선택 */}
          {step === 2 && (
            <motion.div key="step2" {...fadeSlide}>
              <DateSelector
                symbol={symbol}
                onSelect={handleSelectDate}
                onBack={() => setStep(1)}
              />
            </motion.div>
          )}

          {/* STEP 3 — 종합 지표 */}
          {step === 3 && (
            <motion.div key="step3" {...fadeSlide}>
              {analysisLoading ? (
                <AnalysisLoader />
              ) : analysisError ? (
                <ErrorState message={analysisError} onRetry={() => handleSelectDate(endDate)} />
              ) : analysis ? (
                <StockInfoPanel
                  analysis={analysis}
                  endDate={endDate}
                  onNext={handleAnalysisDone}
                  onBack={() => setStep(2)}
                />
              ) : null}
            </motion.div>
          )}

          {/* STEP 4 — 예측 입력 */}
          {step === 4 && (
            <motion.div key="step4" {...fadeSlide}>
              <div className="space-y-6">
                <div className="tag text-accent">// STEP_4 — 내 예측 입력</div>

                {analysis && (
                  <div className="flex items-center gap-2 p-3 bg-surface border border-border rounded-lg">
                    <span className="text-lg">{analysis.quote.market === 'KR' ? '🇰🇷' : '🇺🇸'}</span>
                    <div>
                      <div className="font-bold text-white text-sm">{analysis.quote.name}</div>
                      <div className="text-xs text-muted font-mono">{endDate} 결과 기준</div>
                    </div>
                  </div>
                )}

                <p className="text-muted text-sm">
                  결과 날짜(<span className="text-accent font-mono">{endDate}</span>)의
                  등락률을 예측하세요.
                </p>

                <PercentSlider value={userPercent} onChange={setUserPercent} />

                {submitError && (
                  <div className="p-3 bg-down/10 border border-down/30 rounded-lg text-sm text-down">
                    {submitError}
                  </div>
                )}

                {session && (
                  <div className="text-xs text-muted font-mono text-center">
                    <span className="text-accent">{session.nickname}</span> 님으로 참전
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(3)}
                    className="px-4 py-3 border border-border text-muted rounded-lg text-sm font-mono hover:border-white hover:text-white transition-colors"
                  >
                    ← 지표 다시보기
                  </button>
                  <button
                    onClick={handleSubmitPrediction}
                    disabled={submitting}
                    className="flex-1 py-3 bg-accent text-bg font-bold rounded-lg hover:bg-accent-dim transition-colors disabled:opacity-50"
                  >
                    {submitting ? '제출 중...' : 'AI와 배틀 시작 ⚔️'}
                  </button>
                </div>

                {!session && (
                  <p className="text-xs text-muted text-center">
                    제출 시 전화번호 인증이 필요합니다.
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 5 — AI 로딩 */}
          {step === 5 && (
            <motion.div key="step5" {...fadeSlide}>
              <AILoadingScreen aiStep={aiStep} />
            </motion.div>
          )}

          {/* STEP 6 — 결과 */}
          {step === 6 && battle && aiPrediction && (
            <motion.div key="step6" {...fadeSlide}>
              <AIPredictionResult battle={battle} aiPrediction={aiPrediction} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  )
}

// ─── Helpers ─────────────────────────────────────────────────

function sym(symbol: string) {
  return encodeURIComponent(symbol)
}

const fadeSlide = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2 },
}

function StepIndicator({ step }: { step: Step }) {
  return (
    <div className="flex items-center gap-1.5">
      {([1, 2, 3, 4, 5, 6] as Step[]).map(s => (
        <div
          key={s}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            s < step
              ? 'w-3 bg-accent'
              : s === step
              ? 'w-5 bg-accent'
              : 'w-3 bg-border'
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
              i < aiStep
                ? 'border-accent/40 bg-accent/5'
                : i === aiStep
                ? 'border-[#7C3AED]/40 bg-[#7C3AED]/5'
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
