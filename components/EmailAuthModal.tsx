'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { authenticateEmail, saveSession, formatNickname } from '@/lib/storage'
import type { UserSession } from '@/lib/types'
import Input from '@vibe/design-system/components/ui/Input'
import Button from '@vibe/design-system/components/ui/Button'
import { useLocale } from '@/components/LocaleProvider'

interface EmailAuthModalProps {
  onAuth: (session: UserSession) => void
  onClose?: () => void
}

type ModalStep = 'email' | 'phone' | 'submitting' | 'success'

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}


function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}

function isValidPhone(phone: string): boolean {
  return /^010-\d{4}-\d{4}$/.test(phone)
}

export default function EmailAuthModal({ onAuth, onClose }: EmailAuthModalProps) {
  const { tr } = useLocale()
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [modalStep, setModalStep] = useState<ModalStep>('email')
  const [isNew, setIsNew] = useState(false)
  const [error, setError] = useState('')

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValidEmail(email)) return

    setModalStep('submitting')
    setError('')

    const result = await authenticateEmail(email)

    if (!result.success) {
      setError(tr('오류가 발생했습니다. 다시 시도해주세요.', 'Something went wrong. Please try again.'))
      setModalStep('email')
      return
    }

    if (result.isNew) {
      setIsNew(true)
      setModalStep('phone')
      return
    }

    completeLogin(result.phone ?? '')
  }

  async function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault()
    const rawPhone = isValidPhone(phone) ? phone.replace(/-/g, '') : ''
    await authenticateEmail(email, rawPhone || undefined)
    completeLogin(rawPhone)
  }

  function completeLogin(phone: string) {
    const session: UserSession = {
      email,
      phone,
      nickname: formatNickname(email),
    }
    saveSession(session)
    setModalStep('success')
    setTimeout(() => onAuth(session), 1200)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-md bg-surface border border-border rounded-xl p-8"
      >
        {onClose && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="absolute top-4 right-4 w-9 min-h-9 px-0"
            aria-label={tr('닫기', 'Close')}
          >
            ✕
          </Button>
        )}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">{tr('이메일로 참전하기', 'Join with Email')}</h2>
          <p className="text-muted text-sm">
            {modalStep === 'phone'
              ? tr('처음 오셨군요! 연락처를 남겨주시면 소식을 드려요.', 'Welcome! You may optionally leave a phone number for updates.')
              : tr('이메일 주소로 전적이 관리됩니다.', 'Your battle record is linked to your email.')}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {modalStep === 'success' ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-8"
            >
              <div className="text-5xl mb-4">⚔️</div>
              <div className="text-accent font-bold text-xl mb-2">
                {isNew ? tr('참전 등록 완료!', 'Registration complete!') : tr('돌아오셨군요!', 'Welcome back!')}
              </div>
              <div className="text-muted text-sm">{tr('배틀 아레나로 입장 중...', 'Entering the battle arena...')}</div>
            </motion.div>
          ) : modalStep === 'phone' ? (
            <motion.form
              key="phone"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              onSubmit={handlePhoneSubmit}
            >
              <div className="text-xs text-muted font-mono mb-4">
                <span className="text-accent">{email}</span>
              </div>
              <div className="mb-4">
                <Input
                  type="tel"
                  label={tr('PHONE_NUMBER (선택)', 'PHONE NUMBER (OPTIONAL)')}
                  value={phone}
                  onChange={e => setPhone(formatPhone(e.target.value))}
                  placeholder="010-0000-0000"
                  mono
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                size="lg"
                disabled={phone.length > 0 && !isValidPhone(phone)}
                className="w-full"
                pulse={phone.length === 0 || isValidPhone(phone)}
              >
                ⚔️ {tr('참전 등록', 'Complete Registration')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => completeLogin('')}
                className="w-full mt-3"
              >
                {tr('건너뛰기', 'Skip')} →
              </Button>
            </motion.form>
          ) : (
            <motion.form
              key="email"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              onSubmit={handleEmailSubmit}
            >
              <div className="mb-6">
                <Input
                  type="email"
                  label="EMAIL"
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value)
                    setError('')
                  }}
                  placeholder="you@example.com"
                  error={error}
                  mono
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                size="lg"
                disabled={!isValidEmail(email) || modalStep === 'submitting'}
                className="w-full"
                pulse={isValidEmail(email) && modalStep !== 'submitting'}
              >
                {modalStep === 'submitting' ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" />
                    {tr('확인 중...', 'Checking...')}
                  </span>
                ) : tr('다음 →', 'Continue →')}
              </Button>
              <p className="mt-4 text-xs text-muted text-center">
                {tr('이메일은 배틀 전적 관리에만 사용됩니다', 'Email is used only to manage your battle record')}
              </p>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
