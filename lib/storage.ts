import { getSupabase } from './supabase'
import type { UserSession } from './types'

const KEYS = { session: 'ai_battle_session' }

function safeLS() {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage ?? null
  } catch {
    return null
  }
}

function notifySessionChange() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('session-change'))
}

export function saveSession(session: UserSession) {
  safeLS()?.setItem(KEYS.session, JSON.stringify(session))
  notifySessionChange()
}

// 화면 표시를 빠르게 하기 위한 캐시일 뿐이며, 실제 권한은 Supabase 로그인 토큰으로 확인한다.
export function loadSession(): UserSession | null {
  const raw = safeLS()?.getItem(KEYS.session)
  if (!raw) return null
  try {
    const session = JSON.parse(raw) as UserSession
    if (!session.userId || !session.email) {
      safeLS()?.removeItem(KEYS.session)
      return null
    }
    return session
  } catch {
    safeLS()?.removeItem(KEYS.session)
    return null
  }
}

export async function clearSession() {
  safeLS()?.removeItem(KEYS.session)
  notifySessionChange()
  const sb = getSupabase()
  if (sb) await sb.auth.signOut({ scope: 'local' }).catch(() => undefined)
}

export async function getAccessToken(): Promise<string | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data } = await sb.auth.getSession()
  return data.session?.access_token ?? null
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function syncAuthenticatedSession(phone?: string): Promise<{ session: UserSession; isNew: boolean } | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data } = await sb.auth.getSession()
  const authSession = data.session
  if (!authSession?.user.email) return null

  const response = await fetch('/api/auth/profile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authSession.access_token}`,
    },
    body: JSON.stringify(phone === undefined ? {} : { phone }),
  })
  if (!response.ok) return null

  const result = await response.json() as {
    isNew: boolean
    profile: { user_id: string; email: string; phone: string | null; nickname: string | null }
  }
  const session: UserSession = {
    userId: result.profile.user_id,
    email: result.profile.email,
    phone: result.profile.phone ?? '',
    nickname: result.profile.nickname || formatNickname(result.profile.email),
  }
  saveSession(session)
  return { session, isNew: result.isNew }
}

export async function restoreAuthenticatedSession(): Promise<UserSession | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data } = await sb.auth.getSession()
  if (!data.session) {
    safeLS()?.removeItem(KEYS.session)
    notifySessionChange()
    return null
  }
  return (await syncAuthenticatedSession())?.session ?? null
}

export async function updateNickname(userId: string, nickname: string): Promise<boolean> {
  const sb = getSupabase()
  if (!sb) return false
  const { error } = await sb.from('battle_users').update({ nickname }).eq('user_id', userId)
  if (error) {
    console.error('[storage] updateNickname:', error)
    return false
  }
  return true
}

export function formatNickname(email: string): string {
  const local = email.split('@')[0]
  return `트레이더${local.slice(-4)}`
}
