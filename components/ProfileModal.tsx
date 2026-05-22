'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { saveSession, clearSession, updateNickname } from '@/lib/storage'
import type { UserSession } from '@/lib/types'

interface ProfileModalProps {
  session: UserSession
  onClose: () => void
  onLogout: () => void
  onUpdate: (session: UserSession) => void
}

export default function ProfileModal({ session, onClose, onLogout, onUpdate }: ProfileModalProps) {
  const [nickname, setNickname] = useState(session.nickname)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    if (!nickname.trim() || nickname === session.nickname) return
    setSaving(true)
    await updateNickname(session.email, nickname.trim())
    const updated = { ...session, nickname: nickname.trim() }
    saveSession(updated)
    onUpdate(updated)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleLogout() {
    clearSession()
    onLogout()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end bg-black/50 backdrop-blur-sm p-4 pt-16"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        transition={{ duration: 0.15 }}
        className="w-80 bg-surface border border-border rounded-xl p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5">
          <div className="tag text-accent mb-2">// PROFILE</div>
          <div className="text-white font-bold text-lg">{session.nickname}</div>
        </div>

        {/* Info */}
        <div className="space-y-3 mb-5">
          <InfoRow label="EMAIL" value={session.email} />
          <InfoRow label="PHONE" value={session.phone ? formatPhone(session.phone) : '미등록'} dim={!session.phone} />
        </div>

        {/* Nickname edit */}
        <div className="mb-5">
          <label className="block text-xs font-mono text-muted mb-1.5">NICKNAME</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              maxLength={20}
              className="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-accent transition-colors"
            />
            <button
              onClick={handleSave}
              disabled={saving || !nickname.trim() || nickname === session.nickname}
              className="px-3 py-2 text-xs font-mono rounded-lg border border-accent text-accent hover:bg-accent/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? '...' : saved ? '✓' : '저장'}
            </button>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full py-2.5 rounded-lg border border-danger/40 text-danger text-sm font-mono hover:bg-danger/10 transition-colors"
        >
          로그아웃
        </button>
      </motion.div>
    </div>
  )
}

function InfoRow({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50">
      <span className="text-xs font-mono text-muted">{label}</span>
      <span className={`text-xs font-mono ${dim ? 'text-muted/50' : 'text-white'}`}>{value}</span>
    </div>
  )
}

function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, '')
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`
  return phone
}
