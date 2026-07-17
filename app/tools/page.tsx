'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Button from '@vibe/design-system/components/ui/Button'
import type { AITool } from '@/lib/types'
import { fetchAITools } from '@/lib/aiTools'
import AIToolCard from '@/components/AIToolCard'

type Filter = 'all' | 'battle' | 'free'

export default function ToolsPage() {
  const [tools, setTools] = useState<AITool[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    fetchAITools().then(setTools).catch(() => setError('도구 목록을 불러오지 못했습니다.')).finally(() => setLoading(false))
  }, [])

  const visible = useMemo(() => tools.filter(tool => {
    if (filter === 'battle') return tool.integration_type === 'built_in' || (tool.integration_type === 'api' && tool.verification_status === 'verified')
    if (filter === 'free') return tool.pricing === 'free'
    return true
  }), [tools, filter])

  return (
    <main className="min-h-screen bg-bg">
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-9">
          <div>
            <p className="text-accent text-sm font-mono mb-2">AI 투자 도구 광장</p>
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-3">도구를 발견하고<br />실력으로 검증하세요</h1>
            <p className="text-muted max-w-xl">다른 제작자의 투자 도구를 써보고 리뷰하거나, 같은 조건에서 직접 대결할 수 있습니다.</p>
          </div>
          <Link href="/tools/new"><Button size="lg">내 도구 등록</Button></Link>
        </div>

        <div className="flex gap-2 mb-6">
          {([
            ['all', '전체'], ['battle', '배틀 가능'], ['free', '무료'],
          ] as const).map(([value, label]) => (
            <Button key={value} size="sm" variant={filter === value ? 'primary' : 'secondary'} onClick={() => setFilter(value)}>
              {label}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 gap-4">{[1, 2, 3, 4].map(i => <div key={i} className="h-64 bg-surface border border-border rounded-xl animate-pulse" />)}</div>
        ) : error ? (
          <div className="p-8 border border-danger/40 rounded-xl text-danger text-center">{error}<br /><span className="text-muted text-sm">Supabase에서 ai_tools.sql을 먼저 실행해주세요.</span></div>
        ) : visible.length ? (
          <div className="grid md:grid-cols-2 gap-4">{visible.map(tool => <AIToolCard key={tool.id} tool={tool} />)}</div>
        ) : (
          <div className="p-12 border border-border rounded-xl text-muted text-center">조건에 맞는 도구가 없습니다.</div>
        )}
      </section>
    </main>
  )
}
