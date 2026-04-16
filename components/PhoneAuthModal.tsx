'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { authenticatePhone, saveSession } from '@/lib/storage'
import type { UserSession } from '@/lib/types'

interface PhoneAuthModalProps {
  onAuth: (session: UserSession) => void
}

type FormState = 'idle' | 'submitting' | 'success'

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}

function isValidPhone(phone: string): boolean {
  return /^010-\d{4}-\d{4}$/.test(phone)
}

export default function PhoneAuthModal({ onAuth }: PhoneAuthModalProps) {
  const [phone, setPhone] = useState('')
  const [formState, setFormState] = useState<FormState>('idle')
  const [error, setError] = useState('')
  const [isNew, setIsNew] = useState(false)

  const valid = isValidPhone(phone)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid || formState === 'submitting') return

    setFormState('submitting')
    setError('')

    const rawPhone = phone.replace(/-/g, '')
    const result = await authenticatePhone(rawPhone)

    if (!result.success) {
      setError('인증에 실패했습니다. 다시 시도해주세요.')
      setFormState('idle')
      return
    }

    setIsNew(result.isNew)
    setFormState('success')

    setTimeout(() => {
      const session: UserSession = {
        phone: rawPhone,
        nickname: `트레이더${rawPhone.slice(-4)}`,
      }
      saveSession(session)
      onAuth(session)
    }, 1200)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-surface border border-border rounded-xl p-8"
      >
        {/* Header */}
        <div className="mb-8">
          <div className="tag text-accent mb-3">// BATTLE_ACCESS</div>
          <h2 className="text-2xl font-bold text-white mb-2">전화번호로 참전하기</h2>
          <p className="text-muted text-sm">
            베타 신청자는 바로 입장 가능합니다.<br />
            신규라면 지금 등록하고 AI와 배틀하세요.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {formState === 'success' ? (
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
          ) : (
            <motion.form key="form" onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="block text-sm text-muted mb-2 font-mono">
                  PHONE_NUMBER
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => {
                    setPhone(formatPhone(e.target.value))
                    setError('')
                  }}
                  placeholder="010-0000-0000"
                  className="w-full px-4 py-3 rounded-lg font-mono text-lg bg-surface-2 border border-border text-white placeholder-[#333] focus:border-accent focus:ring-0"
                  autoFocus
                />
                {error && (
                  <p className="mt-2 text-sm text-danger">{error}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={!valid || formState === 'submitting'}
                className={`w-full py-4 rounded-lg font-bold text-lg transition-all duration-200 ${
                  valid && formState !== 'submitting'
                    ? 'bg-accent text-bg btn-pulse cursor-pointer hover:bg-accent-dim'
                    : 'bg-border text-muted cursor-not-allowed'
                }`}
              >
                {formState === 'submitting' ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" />
                    인증 중...
                  </span>
                ) : '⚔️ 배틀 참전'}
              </button>

              <p className="mt-4 text-xs text-muted text-center">
                전화번호는 배틀 전적 관리에만 사용됩니다
              </p>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
