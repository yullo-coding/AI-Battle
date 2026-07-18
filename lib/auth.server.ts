import type { NextRequest } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { getSupabaseAdmin } from './supabase-admin.server'

export class AuthError extends Error {
  status: number

  constructor(message = '로그인이 필요합니다.', status = 401) {
    super(message)
    this.status = status
  }
}

export async function requireAuthenticatedUser(req: NextRequest): Promise<User> {
  const header = req.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) throw new AuthError()

  const { data, error } = await getSupabaseAdmin().auth.getUser(token)
  if (error || !data.user?.email) throw new AuthError('인증이 만료되었습니다. 다시 로그인해주세요.')
  return data.user
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false
  const configured = (process.env.ADMIN_EMAILS ?? 'artsyull@gmail.com')
    .split(',')
    .map(value => value.trim().toLowerCase())
    .filter(Boolean)
  return configured.includes(email.toLowerCase())
}

export async function requireAdminUser(req: NextRequest): Promise<User> {
  const user = await requireAuthenticatedUser(req)
  if (!isAdminEmail(user.email)) throw new AuthError('관리자만 접근할 수 있습니다.', 403)
  return user
}

export function publicBattle(row: Record<string, unknown>) {
  const safe = { ...row }
  delete safe.email
  delete safe.user_id
  return safe
}
