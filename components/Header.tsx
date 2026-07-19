'use client'

import { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { loadSession, restoreAuthenticatedSession } from '@/lib/storage'
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
  const [showMobileNav, setShowMobileNav] = useState(false)

  useEffect(() => {
    setSession(loadSession())
    void restoreAuthenticatedSession().then(setSession)
    const handler = () => setSession(loadSession())
    window.addEventListener('session-change', handler)
    window.addEventListener('storage', handler)
    return () => {
      window.removeEventListener('session-change', handler)
      window.removeEventListener('storage', handler)
    }
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <Link href="/" className="font-mono text-sm font-bold text-accent hover:text-accent-dim transition-colors">
            AI_BATTLE
          </Link>

          <nav className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-4 md:flex">
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
            </div>

            <Button
              size="sm"
              variant="secondary"
              className="min-w-10 px-2"
              onClick={() => { setLocale(locale === 'ko' ? 'en' : 'ko'); setShowMobileNav(false) }}
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
                className="px-2 sm:px-3"
              >
                <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center">
                  <span className="text-accent text-xs font-bold">
                    {session.nickname.slice(-1)}
                  </span>
                </div>
                <span className="hidden text-xs font-mono text-white sm:inline">{session.nickname}</span>
              </Button>
            ) : (
              <Button size="sm" onClick={() => setShowAuth(true)}>
                {tr('로그인', 'Sign in')}
              </Button>
            )}

            <Button
              size="sm"
              variant="secondary"
              className="w-10 px-0 md:hidden"
              onClick={() => setShowMobileNav(current => !current)}
              aria-expanded={showMobileNav}
              aria-label={showMobileNav ? tr('메뉴 닫기', 'Close menu') : tr('메뉴 열기', 'Open menu')}
            >
              {showMobileNav ? '✕' : '☰'}
            </Button>
          </nav>
        </div>

        {showMobileNav && (
          <nav className="border-t border-border bg-surface px-4 py-3 md:hidden" aria-label={tr('모바일 메뉴', 'Mobile navigation')}>
            <div className="mx-auto grid max-w-4xl grid-cols-2 gap-2">
              <MobileNavLink href="/tools" onClick={() => setShowMobileNav(false)}>🤖 {tr('AI 도구', 'AI Tools')}</MobileNavLink>
              <MobileNavLink href="/leaderboard" onClick={() => setShowMobileNav(false)}>🏆 {tr('랭킹', 'Ranking')}</MobileNavLink>
              <MobileNavLink href="/my-battles" onClick={() => setShowMobileNav(false)}>📊 {tr('내 배틀', 'My Battles')}</MobileNavLink>
              <MobileNavLink href="/battle/new" onClick={() => setShowMobileNav(false)} accent>⚔️ {tr('새 배틀', 'New Battle')}</MobileNavLink>
            </div>
          </nav>
        )}
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

function MobileNavLink({ href, children, onClick, accent = false }: { href: string; children: React.ReactNode; onClick: () => void; accent?: boolean }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`rounded-lg border border-border bg-bg px-3 py-3 text-sm font-bold transition-colors hover:border-white/50 hover:text-white ${accent ? 'text-accent' : 'text-muted'}`}
    >
      {children}
    </Link>
  )
}
