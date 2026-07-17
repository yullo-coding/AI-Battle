'use client'

import { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { loadSession } from '@/lib/storage'
import type { UserSession } from '@/lib/types'
import ProfileModal from '@/components/ProfileModal'
import EmailAuthModal from '@/components/EmailAuthModal'
import Button from '@vibe/design-system/components/ui/Button'
import { useLocale } from '@/components/LocaleProvider'

export default function Header() {
  const { locale, setLocale, tr } = useLocale()
  const [session, setSession] = useState<UserSession | null>(null)
  const [showProfile, setShowProfile] = useState(false)
  const [showAuth, setShowAuth] = useState(false)

  useEffect(() => {
    setSession(loadSession())
    const handler = () => setSession(loadSession())
    window.addEventListener('session-change', handler)
    return () => window.removeEventListener('session-change', handler)
  }, [])

  function handleAuth(s: UserSession) {
    setSession(s)
    setShowAuth(false)
  }

  function handleLogout() {
    setSession(null)
    setShowProfile(false)
  }

  function handleUpdate(s: UserSession) {
    setSession(s)
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="font-mono text-sm font-bold text-accent hover:text-accent-dim transition-colors">
            AI_BATTLE
          </Link>

          <nav className="flex items-center gap-3 sm:gap-4">
            <Link href="/tools" className="text-xs font-mono text-muted hover:text-white transition-colors">
              {tr('AI 도구', 'AI Tools')}
            </Link>
            <Link href="/leaderboard" className="text-xs font-mono text-muted hover:text-white transition-colors">
              {tr('랭킹', 'Ranking')}
            </Link>
            <Link href="/my-battles" className="text-xs font-mono text-muted hover:text-white transition-colors">
              {tr('내 배틀', 'My Battles')}
            </Link>
            <Link href="/battle/new" className="text-xs font-mono text-accent hover:text-accent-dim transition-colors">
              ⚔️ {tr('배틀', 'Battle')}
            </Link>

            <Button
              size="sm"
              variant="secondary"
              className="min-w-10 px-2"
              onClick={() => setLocale(locale === 'ko' ? 'en' : 'ko')}
              aria-label={locale === 'ko' ? 'Switch to English' : '한국어로 전환'}
            >
              <span className="sm:hidden">{locale === 'ko' ? 'EN' : '한'}</span>
              <span className="hidden sm:inline">{locale === 'ko' ? 'English' : '한국어'}</span>
            </Button>

            {session ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowProfile(true)}
                className="px-3"
              >
                <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center">
                  <span className="text-accent text-xs font-bold">
                    {session.nickname.slice(-1)}
                  </span>
                </div>
                <span className="text-xs font-mono text-white">{session.nickname}</span>
              </Button>
            ) : (
              <Button size="sm" onClick={() => setShowAuth(true)}>
                {tr('로그인', 'Sign in')}
              </Button>
            )}
          </nav>
        </div>
      </header>

      <AnimatePresence>
        {showProfile && session && (
          <ProfileModal
            session={session}
            onClose={() => setShowProfile(false)}
            onLogout={handleLogout}
            onUpdate={handleUpdate}
          />
        )}
      </AnimatePresence>

      {showAuth && (
        <EmailAuthModal
          onAuth={handleAuth}
          onClose={() => setShowAuth(false)}
        />
      )}
    </>
  )
}
