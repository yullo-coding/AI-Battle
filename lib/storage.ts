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
}

export function loadSession(): UserSession | null {
  const raw = safeLS()?.getItem(KEYS.session)
  if (!raw) return null
  try { return JSON.parse(raw) as UserSession } catch { return null }
}

export function clearSession() {
  safeLS()?.removeItem(KEYS.session)
}

// ─── 이메일 인증 ───────────────────────────────────────────────
export async function authenticateEmail(
  email: string,
  phone?: string
): Promise<{ success: boolean; isNew: boolean; phone?: string }> {
  const sb = getSupabase()
  if (!sb) return { success: false, isNew: false }

  const { data: existing } = await sb
    .from('signups')
    .select('email, phone')
    .eq('email', email)
    .maybeSingle()

  if (existing) {
    return { success: true, isNew: false, phone: existing.phone ?? '' }
  }

  const { error } = await sb.from('signups').insert({
    email,
    phone: phone ?? '',
    selected_options: ['B'],
    option_labels: ['AI 배틀'],
    timestamp: Date.now(),
  })

  if (error) {
    console.error('[storage] auth signup:', error)
    return { success: false, isNew: false }
  }

  return { success: true, isNew: true, phone: phone ?? '' }
}

function formatNickname(email: string): string {
  const local = email.split('@')[0]
  return `트레이더${local.slice(-4)}`
}

export { formatNickname }
