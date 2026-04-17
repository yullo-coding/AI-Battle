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

// ─── 전화번호 인증 ─────────────────────────────────────────────
export async function authenticatePhone(phone: string): Promise<{ success: boolean; isNew: boolean }> {
  const sb = getSupabase()
  if (!sb) return { success: false, isNew: false }

  const { data: existing } = await sb
    .from('signups')
    .select('phone')
    .eq('phone', phone)
    .maybeSingle()

  if (existing) {
    saveSession({ phone, nickname: formatNickname(phone) })
    return { success: true, isNew: false }
  }

  const { error } = await sb.from('signups').insert({
    phone,
    selected_options: ['B'],
    option_labels: ['AI 배틀'],
    timestamp: Date.now(),
  })

  if (error) {
    console.error('[storage] auth signup:', error)
    return { success: false, isNew: false }
  }

  saveSession({ phone, nickname: formatNickname(phone) })
  return { success: true, isNew: true }
}

function formatNickname(phone: string): string {
  return `트레이더${phone.slice(-4)}`
}
