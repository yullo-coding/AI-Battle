'use client'

import Button from '@vibe/design-system/components/ui/Button'
import Card from '@vibe/design-system/components/ui/Card'
import { useLocale } from '@/components/LocaleProvider'

interface AuthEntryGateProps {
  kind: 'battle' | 'tool' | 'records'
  onLogin: () => void
}

export default function AuthEntryGate({ kind, onLogin }: AuthEntryGateProps) {
  const { tr } = useLocale()
  const isBattle = kind === 'battle'
  const isRecords = kind === 'records'

  const steps = isRecords
    ? [
        tr('전체 전적 확인', 'Full record'),
        tr('예측 오차 비교', 'Error comparison'),
        tr('상세 결과 분석', 'Result analysis'),
      ]
    : isBattle
    ? [
        tr('AI 도구 선택', 'Choose AI'),
        tr('종목·결과일 선택', 'Stock & date'),
        tr('예측하고 승부하기', 'Predict & battle'),
      ]
    : [
        tr('도구 등록', 'Submit'),
        tr('리뷰 받기', 'Reviews'),
        tr('API 선택 연결', 'Optional API'),
      ]

  return (
    <section className="max-w-lg mx-auto px-6 py-16 sm:py-24">
      <Card className="p-7 sm:p-8 text-center">
        <div className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border text-2xl ${isBattle || isRecords ? 'border-human/40 bg-human/10' : 'border-[#A78BFA]/40 bg-[#A78BFA]/10'}`}>
          {isRecords ? '📊' : isBattle ? '⚔️' : 'AI'}
        </div>
        <p className={`text-xs font-mono mb-2 ${isBattle || isRecords ? 'text-human' : 'text-[#C4B5FD]'}`}>
          {isRecords ? tr('내 배틀 전적', 'My battle record') : isBattle ? tr('배틀 시작하기', 'Start a battle') : tr('제작자 시작하기', 'Builder sign-in')}
        </p>
        <h1 className="text-2xl sm:text-3xl font-black text-white mb-3">
          {isRecords ? tr('로그인하고 내 전적을 확인하세요', 'Sign in to view your record') : isBattle ? tr('로그인하고 배틀을 시작하세요', 'Sign in to start a battle') : tr('로그인하고 내 도구를 등록하세요', 'Sign in to submit your tool')}
        </h1>
        <p className="text-sm text-muted leading-relaxed mb-7">
          {isRecords
            ? tr('진행 중인 배틀부터 승패와 예측 오차까지 한곳에서 확인할 수 있어요.', 'See active battles, results, and prediction errors in one place.')
            : isBattle
            ? tr('내 예측과 승부 결과를 계정에 저장하고, 언제든 전적을 다시 확인할 수 있어요.', 'Save predictions and results to your account and revisit your record anytime.')
            : tr('도구의 제작자 정보와 등록 내역을 로그인 계정에 안전하게 연결합니다.', 'Your signed-in account is securely linked to the tool and its submission record.')}
        </p>
        <div className="grid grid-cols-3 gap-2 mb-7 text-xs">
          {steps.map((step, index) => (
            <div key={step} className="rounded-xl border border-border bg-surface-2 p-3 text-muted">
              <strong className="block text-white mb-1">0{index + 1}</strong>
              {step}
            </div>
          ))}
        </div>
        <Button size="lg" variant={isBattle || isRecords ? 'human' : 'primary'} className="w-full" onClick={onLogin}>
          {tr('이메일로 로그인', 'Sign in with email')} →
        </Button>
      </Card>
    </section>
  )
}
