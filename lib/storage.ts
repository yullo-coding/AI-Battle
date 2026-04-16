import { getSupabase } from './supabase'
import type { UserSession, Direction } from './types'

const KEYS = {
  session: 'ai_battle_session',
  myPredictions: 'ai_battle_predictions',
}

function safeLS() {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

// --- Session ---

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

// --- Phone auth: check existing signups table or register new ---

export async function authenticatePhone(phone: string): Promise<{ success: boolean; isNew: boolean }> {
  const sb = getSupabase()
  if (!sb) return { success: false, isNew: false }

  // Check existing beta signups
  const { data: existing } = await sb
    .from('signups')
    .select('phone')
    .eq('phone', phone)
    .maybeSingle()

  if (existing) {
    saveSession({ phone, nickname: formatNickname(phone) })
    return { success: true, isNew: false }
  }

  // New user — register in signups table
  const { error } = await sb.from('signups').insert({
    phone,
    selected_options: ['B'],
    option_labels: ['AI 배틀'],
    timestamp: Date.now(),
  })

  if (error) {
    console.error('[supabase] auth signup:', error)
    return { success: false, isNew: false }
  }

  saveSession({ phone, nickname: formatNickname(phone) })
  return { success: true, isNew: true }
}

function formatNickname(phone: string): string {
  return `트레이더${phone.slice(-4)}`
}

// --- Predictions (local cache) ---

export function saveLocalPrediction(roundId: string, prediction: Direction, periodDays: number) {
  const ls = safeLS()
  if (!ls) return
  const existing: Record<string, { prediction: Direction; periodDays: number }> = JSON.parse(
    ls.getItem(KEYS.myPredictions) || '{}'
  )
  existing[roundId] = { prediction, periodDays }
  ls.setItem(KEYS.myPredictions, JSON.stringify(existing))
}

export function loadLocalPrediction(roundId: string): { prediction: Direction; periodDays: number } | null {
  const raw = safeLS()?.getItem(KEYS.myPredictions)
  if (!raw) return null
  try {
    const all = JSON.parse(raw) as Record<string, { prediction: Direction; periodDays: number }>
    return all[roundId] ?? null
  } catch { return null }
}

// --- Submit prediction to Supabase ---

export async function submitPrediction(
  roundId: string,
  phone: string,
  nickname: string,
  prediction: Direction,
  periodDays: number
): Promise<{ success: boolean; error?: string }> {
  const sb = getSupabase()
  if (!sb) return { success: false, error: 'No client' }

  saveLocalPrediction(roundId, prediction, periodDays)

  const { error } = await sb.from('battle_predictions').insert({
    round_id: roundId,
    phone,
    nickname,
    prediction,
    period_days: periodDays,
  })

  if (error) {
    if (error.code === '23505') return { success: false, error: '이미 예측을 제출했습니다.' }
    console.error('[supabase] prediction:', error)
    return { success: false, error: '제출 실패. 다시 시도해주세요.' }
  }

  return { success: true }
}
