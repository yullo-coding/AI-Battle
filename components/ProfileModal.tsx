'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { saveSession, clearSession, updateNickname } from '@/lib/storage'
import { loadApiSettings, saveApiSettings, maskApiKey, type ApiMode } from '@/lib/apiSettings'
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
  const [apiMode, setApiMode] = useState<ApiMode>('own')
  const [apiKey, setApiKey] = useState('')
  const [apiSaved, setApiSaved] = useState(false)
  const [editingKey, setEditingKey] = useState(false)

  useEffect(() => {
    const s = loadApiSettings()
    if (s) { setApiMode(s.mode); setApiKey(s.apiKey ?? '') }
  }, [])

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

        {/* AI 설정 */}
        <div className="mb-5 pt-4 border-t border-border/50">
          <div className="text-xs font-mono text-muted mb-3">AI 설정</div>
          <div className="space-y-2">
            <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${apiMode === 'own' ? 'border-accent/50 bg-accent/5' : 'border-border'}`}>
              <input type="radio" name="apiMode" value="own" checked={apiMode === 'own'}
                onChange={() => { setApiMode('own'); setApiSaved(false) }}
                className="mt-0.5 accent-[#00FF88]" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white">내 API 키</div>
                {apiMode === 'own' && (
                  <div className="mt-2">
                    {editingKey || !apiKey ? (
                      <input
                        type="password"
                        value={apiKey}
                        onChange={e => setApiKey(e.target.value)}
                        placeholder="sk-ant-api03-..."
                        className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-xs font-mono text-white placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors"
                        autoFocus
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted">{maskApiKey(apiKey)}</span>
                        <button onClick={() => setEditingKey(true)} className="text-xs text-accent font-mono hover:underline">변경</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </label>

            <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${apiMode === 'service' ? 'border-accent/50 bg-accent/5' : 'border-border'}`}>
              <input type="radio" name="apiMode" value="service" checked={apiMode === 'service'}
                onChange={() => { setApiMode('service'); setApiSaved(false) }}
                className="mt-0.5 accent-[#00FF88]" />
              <div>
                <div className="text-sm font-bold text-white">서비스 API</div>
                <div className="text-xs text-muted mt-0.5">배틀당 결제 · 준비 중 🚧</div>
              </div>
            </label>
          </div>

          <button
            onClick={() => {
              saveApiSettings({ mode: apiMode, apiKey: apiMode === 'own' ? apiKey : undefined })
              setEditingKey(false)
              setApiSaved(true)
              setTimeout(() => setApiSaved(false), 2000)
            }}
            disabled={apiMode === 'own' && !apiKey}
            className="mt-3 w-full py-2 text-xs font-mono rounded-lg border border-accent/50 text-accent hover:bg-accent/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {apiSaved ? '✓ 저장됨' : 'AI 설정 저장'}
          </button>
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
