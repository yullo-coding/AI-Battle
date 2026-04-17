import { NextResponse } from 'next/server'

// This endpoint has been superseded by /api/battle (POST)
export async function POST() {
  return NextResponse.json({ error: 'Use /api/battle instead' }, { status: 410 })
}
