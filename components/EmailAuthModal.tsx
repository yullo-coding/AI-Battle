'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getSupabase } from '@/lib/supabase'
import { syncAuthenticatedSession } from '@/lib/storage'
import type { UserSession } from '@/lib/types'
import Input from '@vibe/design-system/components/ui/Input'
import Button from '@vibe/design-system/components/ui/Button'
import { useLocale } from '@/components/LocaleProvider'

interface EmailAuthModalProps {
  onAuth: (session: UserSession) => void
  onClose?: () => void
}

type ModalStep = 'email' | 'sending' | 'sent' | 'phone' | 'success'

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}

function isValidPhone(phone: string) {
  return /^010-\d{4}-\d{4}$/.test(phone)
}

export default function EmailAuthModal({ onAuth, onClose }: EmailAuthModalProps) {
  const { tr } = useLocale()
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [modalStep, setModalStep] = useState<ModalStep>('email')
  const [error, setError] = useState('')
  const [verifiedSession, setVerifiedSession] = useState<UserSession | null>(null)
  const completing = useRef(false)

  useEffect(() => {
    const sb = getSupabase()
    if (!sb) return

    async function completeVerifiedLogin() {
      if (completing.current) return
      completing.current = true
      const synced = await syncAuthenticatedSession()
      if (!synced) {
        completing.current = false
        setError(tr('인증 정보를 불러오지 못했습니다. 다시 시도해주세요.', 'Could not complete sign-in. Please try again.'))
        return
      }
      setVerifiedSession(synced.session)
      if (synced.isNew) {
        setModalStep('phone')
        completing.current = false
      } else {
        finish(synced.session)
      }
    }

    sb.auth.getSession().then(({ data }) => {
      if (data.session) void completeVerifiedLogin()
    })
    const { data: listener } = sb.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
        void completeVerifiedLogin()
      }
    })
    return () => listener.subscription.unsubscribe()
    // tr/onAuth는 인증 이벤트마다 재구독하지 않도록 의도적으로 제외한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function finish(session: UserSession) {
    setModalStep('success')
    setTimeout(() => onAuth(session), 650)
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    const normalizedEmail = email.trim().toLowerCase()
    if (!isValidEmail(normalizedEmail)) return

    const sb = getSupabase()
    if (!sb) return
    setEmail(normalizedEmail)
    setModalStep('sending')
    setError('')

    const returnTo = `${window.location.pathname}${window.location.search}`
    const callback = new URL('/auth/callback', window.location.origin)
    callback.searchParams.set('returnTo', returnTo)
    const { error: authError } = await sb.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: callback.toString(),
        shouldCreateUser: true,
      },
    })

    if (authError) {
      setError(authError.message)
      setModalStep('email')
      return
    }
    setModalStep('sent')
  }

  async function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault()
    const rawPhone = isValidPhone(phone) ? phone.replace(/-/g, '') : ''
    const synced = await syncAuthenticatedSession(rawPhone)
    if (!synced) {
      setError(tr('연락처를 저장하지 못했습니다.', 'Could not save your phone number.'))
      return
    }
    finish(synced.session)
  }

  function skipPhone() {
    if (verifiedSession) finish(verifiedSession)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-md bg-surface border border-border rounded-xl p-7 sm:p-8"
      >
        {onClose && modalStep !== 'success' && (
          <Button type="button" size="sm" variant="ghost" onClick={onClose} className="absolute top-4 right-4 w-9 min-h-9 px-0" aria-label={tr('닫기', 'Close')}>✕</Button>
        )}

        <div className="mb-7 pr-8">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-xl">✉️</div>
          <h2 className="text-2xl font-black text-white mb-2">{tr('이메일 인증', 'Verify your email')}</h2>
          <p className="text-muted text-sm leading-relaxed">
            {modalStep === 'sent'
              ? tr('메일에 있는 인증 버튼을 누르면 이 화면에서 자동으로 로그인됩니다.', 'Open the verification link in your email. This screen will sign you in automatically.')
              : modalStep === 'phone'
                ? tr('인증이 완료됐어요. 연락처는 선택 사항입니다.', 'Email verified. Adding a phone number is optional.')
                : tr('실제로 받을 수 있는 이메일인지 확인한 뒤 전적을 안전하게 보관합니다.', 'We verify your address before securely linking your records.')}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {modalStep === 'success' ? (
            <motion.div key="success" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-7">
              <div className="text-5xl mb-4">✅</div>
              <div className="text-accent font-black text-xl mb-2">{tr('인증 완료!', 'Verified!')}</div>
              <div className="text-muted text-sm">{tr('계속 진행할게요.', 'Continuing where you left off.')}</div>
            </motion.div>
          ) : modalStep === 'phone' ? (
            <motion.form key="phone" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} onSubmit={handlePhoneSubmit}>
              <div className="mb-4 rounded-lg border border-accent/25 bg-accent/[0.05] px-3 py-2 text-xs font-mono text-accent truncate">✓ {verifiedSession?.email}</div>
              <Input type="tel" label={tr('전화번호 (선택)', 'PHONE NUMBER (OPTIONAL)')} value={phone} onChange={event => setPhone(formatPhone(event.target.value))} placeholder="010-0000-0000" mono autoFocus />
              {error && <p className="mt-2 text-xs text-danger">{error}</p>}
              <Button type="submit" size="lg" disabled={!isValidPhone(phone)} className="w-full mt-5">{tr('저장하고 계속', 'Save and continue')}</Button>
              <Button type="button" variant="ghost" onClick={skipPhone} className="w-full mt-2">{tr('건너뛰고 계속', 'Skip and continue')} →</Button>
            </motion.form>
          ) : modalStep === 'sent' ? (
            <motion.div key="sent" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <div className="rounded-xl border border-accent/30 bg-accent/[0.06] p-4">
                <div className="text-xs text-muted mb-1">{tr('인증 메일을 보낸 주소', 'Verification sent to')}</div>
                <div className="font-mono font-bold text-white break-all">{email}</div>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-muted">
                <span className="h-4 w-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                {tr('인증 완료를 기다리는 중...', 'Waiting for verification...')}
              </div>
              <Button type="button" variant="secondary" className="w-full" onClick={() => setModalStep('email')}>{tr('이메일 주소 다시 입력', 'Use a different email')}</Button>
              <p className="text-center text-xs text-muted">{tr('메일이 안 보이면 스팸함도 확인해주세요.', 'Check your spam folder if you do not see it.')}</p>
            </motion.div>
          ) : (
            <motion.form key="email" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} onSubmit={handleEmailSubmit}>
              <Input type="email" label="EMAIL" value={email} onChange={event => { setEmail(event.target.value); setError('') }} placeholder="you@example.com" error={error} mono autoFocus />
              <Button type="submit" size="lg" disabled={!isValidEmail(email) || modalStep === 'sending'} className="w-full mt-5" pulse={isValidEmail(email) && modalStep !== 'sending'}>
                {modalStep === 'sending' ? tr('인증 메일 보내는 중...', 'Sending verification email...') : tr('인증 메일 받기', 'Send verification email')}
              </Button>
              <p className="mt-4 text-xs text-muted text-center">{tr('비밀번호 없이 안전한 일회용 링크로 로그인합니다.', 'Sign in securely with a one-time link—no password needed.')}</p>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
