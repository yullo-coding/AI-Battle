import { NextRequest, NextResponse } from 'next/server'
import { AuthError, requireAdminUser } from '@/lib/auth.server'
import { getSupabaseAdmin } from '@/lib/supabase-admin.server'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    await requireAdminUser(req)
    const { data, error } = await getSupabaseAdmin()
      .from('battles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) throw error
    return NextResponse.json({ battles: data ?? [] })
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 500
    return NextResponse.json({ error: error instanceof Error ? error.message : '관리자 데이터 조회 실패' }, { status })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdminUser(req)
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: '배틀 ID가 필요합니다.' }, { status: 400 })
    const { error } = await getSupabaseAdmin().from('battles').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 500
    return NextResponse.json({ error: error instanceof Error ? error.message : '삭제 실패' }, { status })
  }
}
