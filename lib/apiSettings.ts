export type ApiMode = 'own' | 'service'

export interface ApiSettings {
  mode: ApiMode
  apiKey?: string  // mode === 'own' 일 때만
}

const KEY = 'ai_battle_api_settings'

function safeLS() {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

export function loadApiSettings(): ApiSettings | null {
  const raw = safeLS()?.getItem(KEY)
  if (!raw) return null
  try { return JSON.parse(raw) as ApiSettings } catch { return null }
}

export function saveApiSettings(s: ApiSettings) {
  safeLS()?.setItem(KEY, JSON.stringify(s))
  window.dispatchEvent(new Event('api-settings-change'))
}

export function clearApiSettings() {
  safeLS()?.removeItem(KEY)
  window.dispatchEvent(new Event('api-settings-change'))
}

export function maskApiKey(key: string): string {
  if (key.length < 8) return '••••••••'
  return key.slice(0, 7) + '••••••••' + key.slice(-4)
}
