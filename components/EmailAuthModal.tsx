'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { authenticateEmail, saveSession, formatNickname } from '@/lib/storage'
import type { UserSession } from '@/lib/types'
import Input from '@vibe/design-system/components/ui/Input'

interface EmailAuthModalProps {
  onAuth: (session: UserSession) => void
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

export default function EmailAuthModal({ onAuth }: EmailAuthModalProps) {
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

    const { data: existing } = await (async () => {
      const { getSupabase } = await import('@/lib/supabase')
      const sb = getSupabase()
      if (!sb) return { data: null }
      return sb.from('signups').select('email, phone').eq('email', email).maybeSingle()
    })()

    if (existing) {
      // 기존 유저 → 바로 로그인
      const session: UserSession = {
        email,
        phone: existing.phone ?? '',
        nickname: formatNickname(email),
      }
      saveSession(session)
      setIsNew(false)
      setModalStep('success')
      setTimeout(() => onAuth(session), 1200)
    } else {
      // 신규 유저 → 전화번호 입력 단계
      setIsNew(true)
      setModalStep('phone')
    }
  }

  async function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValidPhone(phone)) return

    setModalStep('submitting')
    setError('')

    const rawPhone = phone.replace(/-/g, '')
    const result = await authenticateEmail(email, rawPhone)

    if (!result.success) {
      setError('가입에 실패했습니다. 다시 시도해주세요.')
      setModalStep('phone')
      return
    }

    const session: UserSession = {
      email,
      phone: rawPhone,
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
        className="w-full max-w-md bg-surface border border-border rounded-xl p-8"
      >
        <div className="mb-8">
          <div className="tag text-accent mb-3">// BATTLE_ACCESS</div>
          <h2 className="text-2xl font-bold text-white mb-2">이메일로 참전하기</h2>
          <p className="text-muted text-sm">
            {modalStep === 'phone'
              ? '처음 오셨군요! 연락처를 남겨주세요.'
              : '이메일 주소로 전적이 관리됩니다.'}
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
                {isNew ? '참전 등록 완료!' : '돌아오셨군요!'}
              </div>
              <div className="text-muted text-sm">배틀 아레나로 입장 중...</div>
            </motion.div>
          ) : modalStep === 'phone' ? (
            <motion.form
              key="phone"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              onSubmit={handlePhoneSubmit}
            >
              <div className="mb-2">
                <div className="text-xs text-muted font-mono mb-4">
                  <span className="text-accent">{email}</span>
                </div>
              </div>
              <div className="mb-6">
                <Input
                  type="tel"
                  label="PHONE_NUMBER"
                  value={phone}
                  onChange={e => {
                    setPhone(formatPhone(e.target.value))
                    setError('')
                  }}
                  placeholder="010-0000-0000"
                  error={error}
                  mono
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={!isValidPhone(phone)}
                className={`w-full py-4 rounded-lg font-bold text-lg transition-all duration-200 ${
                  isValidPhone(phone)
                    ? 'bg-accent text-bg btn-pulse cursor-pointer hover:bg-accent-dim'
                    : 'bg-border text-muted cursor-not-allowed'
                }`}
              >
                ⚔️ 참전 등록
              </button>
              <button
                type="button"
                onClick={() => setModalStep('email')}
                className="w-full mt-3 py-2 text-sm text-muted font-mono hover:text-white transition-colors"
              >
                ← 이메일 변경
              </button>
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
              <button
                type="submit"
                disabled={!isValidEmail(email) || modalStep === 'submitting'}
                className={`w-full py-4 rounded-lg font-bold text-lg transition-all duration-200 ${
                  isValidEmail(email) && modalStep !== 'submitting'
                    ? 'bg-accent text-bg btn-pulse cursor-pointer hover:bg-accent-dim'
                    : 'bg-border text-muted cursor-not-allowed'
                }`}
              >
                {modalStep === 'submitting' ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" />
                    확인 중...
                  </span>
                ) : '다음 →'}
              </button>
              <p className="mt-4 text-xs text-muted text-center">
                이메일은 배틀 전적 관리에만 사용됩니다
              </p>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
