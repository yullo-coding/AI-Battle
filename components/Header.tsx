'use client'

import { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { loadSession, saveSession } from '@/lib/storage'
import type { UserSession } from '@/lib/types'
import ProfileModal from '@/components/ProfileModal'
import EmailAuthModal from '@/components/EmailAuthModal'

export default function Header() {
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

          <nav className="flex items-center gap-4">
            <Link href="/leaderboard" className="text-xs font-mono text-muted hover:text-white transition-colors">
              랭킹
            </Link>
            <Link href="/my-battles" className="text-xs font-mono text-muted hover:text-white transition-colors">
              내 배틀
            </Link>
            <Link href="/battle/new" className="text-xs font-mono text-accent hover:text-accent-dim transition-colors">
              ⚔️ 배틀
            </Link>

            {session ? (
              <button
                onClick={() => setShowProfile(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border hover:border-accent/50 transition-colors"
              >
                <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center">
                  <span className="text-accent text-xs font-bold">
                    {session.nickname.slice(-1)}
                  </span>
                </div>
                <span className="text-xs font-mono text-white">{session.nickname}</span>
              </button>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="px-3 py-1.5 text-xs font-mono rounded-lg bg-accent text-bg font-bold hover:bg-accent-dim transition-colors"
              >
                로그인
              </button>
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
