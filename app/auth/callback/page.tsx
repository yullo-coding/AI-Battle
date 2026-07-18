'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import { syncAuthenticatedSession } from '@/lib/storage'
import Button from '@vibe/design-system/components/ui/Button'
import { useLocale } from '@/components/LocaleProvider'

type State = 'working' | 'success' | 'error'

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<AuthCallbackShell state="working" />}>
      <AuthCallbackContent />
    </Suspense>
  )
}

function AuthCallbackContent() {
  const { tr } = useLocale()
  const router = useRouter()
  const params = useSearchParams()
  const [state, setState] = useState<State>('working')
  const [message, setMessage] = useState('')
  const started = useRef(false)
  const returnTo = params.get('returnTo')?.startsWith('/') ? params.get('returnTo')! : '/'

  useEffect(() => {
    async function complete() {
      if (started.current) return
      started.current = true
      const sb = getSupabase()
      const code = params.get('code')
      if (!sb || !code) {
        setMessage(tr('인증 링크가 올바르지 않거나 만료되었습니다.', 'This verification link is invalid or expired.'))
        setState('error')
        return
      }

      const { error } = await sb.auth.exchangeCodeForSession(code)
      if (error) {
        setMessage(tr('인증 링크가 만료되었습니다. 다시 로그인해주세요.', 'This link has expired. Please sign in again.'))
        setState('error')
        return
      }
      const synced = await syncAuthenticatedSession()
      if (!synced) {
        setMessage(tr('프로필 연결에 실패했습니다.', 'Could not connect your profile.'))
        setState('error')
        return
      }
      setState('success')

      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: 'ai-battle-auth-complete' }, window.location.origin)
        setTimeout(() => window.close(), 900)
      } else {
        setTimeout(() => router.replace(returnTo), 1200)
      }
    }
    void complete()
  }, [params, returnTo, router, tr])

  return <AuthCallbackShell state={state} message={message} onRetry={() => router.replace(returnTo)} />
}

function AuthCallbackShell({ state, message = '', onRetry }: { state: State; message?: string; onRetry?: () => void }) {
  const { tr } = useLocale()
  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-bg flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center">
        {state === 'working' && <div className="mx-auto mb-5 h-12 w-12 rounded-full border-2 border-accent border-t-transparent animate-spin" />}
        {state === 'success' && <div className="text-5xl mb-5">✅</div>}
        {state === 'error' && <div className="text-5xl mb-5">⚠️</div>}
        <h1 className="text-2xl font-black text-white mb-2">
          {state === 'working' ? tr('이메일 인증 중...', 'Verifying your email...') : state === 'success' ? tr('인증 완료!', 'Email verified!') : tr('인증 실패', 'Verification failed')}
        </h1>
        <p className="text-sm text-muted leading-relaxed mb-6">
          {state === 'working' ? tr('잠시만 기다려주세요.', 'This will only take a moment.') : state === 'success' ? tr('원래 화면으로 돌아갑니다.', 'Returning you to where you left off.') : message}
        </p>
        {state === 'error' && onRetry && <Button className="w-full" onClick={onRetry}>{tr('다시 로그인하기', 'Try again')}</Button>}
      </div>
    </main>
  )
}
