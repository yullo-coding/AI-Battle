import { NextRequest, NextResponse } from 'next/server'
import { AuthError, requireAuthenticatedUser } from '@/lib/auth.server'
import { getSupabaseAdmin } from '@/lib/supabase-admin.server'

export const runtime = 'nodejs'

function cleanPhone(value: unknown): string | null | undefined {
  if (value === undefined) return undefined
  const digits = typeof value === 'string' ? value.replace(/\D/g, '').slice(0, 20) : ''
  return digits || null
}

function defaultNickname(email: string) {
  const local = email.split('@')[0]
  return `트레이더${local.slice(-4)}`
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req)
    const email = user.email!.trim().toLowerCase()
    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const phone = cleanPhone(body.phone)
    const admin = getSupabaseAdmin()

    const { data: byId } = await admin.from('battle_users').select('*').eq('user_id', user.id).maybeSingle()
    const { data: byEmail } = byId
      ? { data: null }
      : await admin.from('battle_users').select('*').ilike('email', email).maybeSingle()
    const existing = byId ?? byEmail
    const isNew = !existing

    const profileValues: Record<string, unknown> = {
      user_id: user.id,
      email,
      nickname: existing?.nickname || defaultNickname(email),
      last_login_at: new Date().toISOString(),
    }
    if (phone !== undefined) profileValues.phone = phone

    const profileResult = existing
      ? await admin.from('battle_users').update(profileValues).eq('id', existing.id).select('*').single()
      : await admin.from('battle_users').insert({ ...profileValues, phone: phone ?? null }).select('*').single()

    if (profileResult.error || !profileResult.data) {
      throw new Error(profileResult.error?.message ?? '프로필을 만들지 못했습니다.')
    }

    // 과거 이메일 기반 데이터도 최초 인증 시 현재 계정에 안전하게 귀속한다.
    await Promise.all([
      admin.from('battles').update({ user_id: user.id }).is('user_id', null).ilike('email', email),
      admin.from('ai_tools').update({ owner_user_id: user.id }).is('owner_user_id', null).ilike('owner_email', email),
      admin.from('ai_tool_likes').update({ user_id: user.id }).is('user_id', null).ilike('user_email', email),
      admin.from('ai_tool_reviews').update({ user_id: user.id }).is('user_id', null).ilike('user_email', email),
      admin.from('ai_tool_integrations').update({ owner_user_id: user.id }).is('owner_user_id', null).ilike('owner_email', email),
    ])

    return NextResponse.json({ profile: profileResult.data, isNew })
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 500
    return NextResponse.json({ error: error instanceof Error ? error.message : '인증 처리 실패' }, { status })
  }
}
