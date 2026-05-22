import { getSupabase } from './supabase'
import type { UserSession } from './types'

const KEYS = {
  session: 'ai_battle_session',
}

function safeLS() {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

// ─── 세션 ─────────────────────────────────────────────────────
export function saveSession(session: UserSession) {
  safeLS()?.setItem(KEYS.session, JSON.stringify(session))
  window.dispatchEvent(new Event('session-change'))
}

export function loadSession(): UserSession | null {
  const raw = safeLS()?.getItem(KEYS.session)
  if (!raw) return null
  try {
    const s = JSON.parse(raw) as UserSession
    if (!s.email) { safeLS()?.removeItem(KEYS.session); return null }
    return s
  } catch { return null }
}

export function clearSession() {
  safeLS()?.removeItem(KEYS.session)
  window.dispatchEvent(new Event('session-change'))
}

export async function updateNickname(email: string, nickname: string): Promise<boolean> {
  const sb = getSupabase()
  if (!sb) return false
  const { error } = await sb.from('battle_users').update({ nickname }).eq('email', email)
  if (error) { console.error('[storage] updateNickname:', error); return false }
  return true
}

// ─── 이메일 인증 ───────────────────────────────────────────────
export async function authenticateEmail(
  email: string,
  phone?: string
): Promise<{ success: boolean; isNew: boolean; phone?: string }> {
  const sb = getSupabase()
  if (!sb) return { success: false, isNew: false }

  const { data: existing } = await sb
    .from('battle_users')
    .select('email, phone')
    .eq('email', email)
    .maybeSingle()

  if (existing) {
    await sb.from('battle_users').update({ last_login_at: new Date().toISOString() }).eq('email', email)
    return { success: true, isNew: false, phone: existing.phone ?? '' }
  }

  const { error } = await sb.from('battle_users').insert({
    email,
    phone: phone ?? null,
    nickname: formatNickname(email),
  })

  if (error) console.error('[storage] battle_users insert:', error)

  return { success: true, isNew: true, phone: phone ?? '' }
}

function formatNickname(email: string): string {
  const local = email.split('@')[0]
  return `트레이더${local.slice(-4)}`
}

export { formatNickname }
