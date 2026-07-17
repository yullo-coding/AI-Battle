'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Button from '@vibe/design-system/components/ui/Button'
import Input from '@vibe/design-system/components/ui/Input'
import type { AITool } from '@/lib/types'
import { fetchAITools, localizedTool, toolAvailability } from '@/lib/aiTools'
import AIToolCard from '@/components/AIToolCard'
import { useLocale } from '@/components/LocaleProvider'

type AvailabilityFilter = 'all' | 'battle' | 'review'
type PricingFilter = 'all' | 'free' | 'freemium' | 'paid'
type SortOption = 'recommended' | 'rating' | 'likes' | 'reviews' | 'newest'

export default function ToolsPage() {
  const { locale, tr } = useLocale()
  const [tools, setTools] = useState<AITool[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [availability, setAvailability] = useState<AvailabilityFilter>('all')
  const [pricing, setPricing] = useState<PricingFilter>('all')
  const [market, setMarket] = useState('all')
  const [sort, setSort] = useState<SortOption>('recommended')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetchAITools().then(setTools).catch(() => setError('LOAD_FAILED')).finally(() => setLoading(false))
  }, [])

  const markets = useMemo(() => Array.from(new Set(tools.flatMap(tool => tool.supported_markets))), [tools])
  const visible = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    const filtered = tools.filter(tool => {
      const battleReady = toolAvailability(tool).battleReady
      if (availability === 'battle' && !battleReady) return false
      if (availability === 'review' && battleReady) return false
      if (pricing !== 'all' && tool.pricing !== pricing) return false
      if (market !== 'all' && !tool.supported_markets.includes(market)) return false
      const copy = localizedTool(tool, locale)
      if (keyword && !`${tool.name} ${tool.name_en ?? ''} ${tool.tagline} ${tool.tagline_en ?? ''} ${tool.description} ${tool.description_en ?? ''} ${copy.name} ${copy.tagline}`.toLowerCase().includes(keyword)) return false
      return true
    })

    return filtered.sort((a, b) => {
      if (sort === 'rating') return (b.average_rating ?? 0) - (a.average_rating ?? 0)
      if (sort === 'likes') return (b.like_count ?? 0) - (a.like_count ?? 0)
      if (sort === 'reviews') return (b.review_count ?? 0) - (a.review_count ?? 0)
      if (sort === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      return Number(b.is_featured) - Number(a.is_featured) || Number(toolAvailability(b).battleReady) - Number(toolAvailability(a).battleReady)
    })
  }, [tools, query, availability, pricing, market, sort, locale])

  const hasFilters = Boolean(query || availability !== 'all' || pricing !== 'all' || market !== 'all' || sort !== 'recommended')
  const advancedFilterCount = Number(pricing !== 'all') + Number(market !== 'all') + Number(sort !== 'recommended')
  function resetFilters() {
    setQuery('')
    setAvailability('all')
    setPricing('all')
    setMarket('all')
    setSort('recommended')
  }

  return (
    <main className="min-h-screen bg-bg">
      <section className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-9">
          <div>
            <p className="text-accent text-sm font-mono mb-2">{tr('AI 투자 도구 광장', 'AI Investing Tool Hub')}</p>
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-3">
              {tr(<>도구를 발견하고<br />실력으로 검증하세요</>, <>Discover tools.<br />Prove them in battle.</>)}
            </h1>
            <p className="text-muted max-w-xl">{tr('다른 제작자의 투자 도구를 써보고 리뷰하거나, 같은 조건에서 직접 대결할 수 있습니다.', 'Explore tools from other builders, review them, and challenge them under the same market conditions.')}</p>
          </div>
          <Link href="/tools/new"><Button size="lg">{tr('내 도구 등록', 'Submit My Tool')}</Button></Link>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-3 mb-6">
          <div className="grid lg:grid-cols-[minmax(260px,1fr)_auto_auto] gap-2.5 items-center">
            <Input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder={tr('도구 이름·기능 검색', 'Search tools and features')}
              aria-label={tr('도구 검색', 'Search tools')}
              className="py-2.5"
            />

            <div className="flex gap-1.5 overflow-x-auto">
              {([
                ['all', tr('전체', 'All')],
                ['battle', tr('배틀 가능', 'Battle ready')],
                ['review', tr('리뷰 전용', 'Review only')],
              ] as Array<[AvailabilityFilter, string]>).map(([option, label]) => (
                <Button
                  key={option}
                  type="button"
                  size="sm"
                  variant={availability === option ? 'primary' : 'secondary'}
                  className="shrink-0"
                  onClick={() => setAvailability(option)}
                >
                  {label}
                </Button>
              ))}
            </div>

            <div className="flex gap-1.5">
              <Button
                type="button"
                size="sm"
                variant={showFilters || advancedFilterCount > 0 ? 'secondary' : 'ghost'}
                aria-expanded={showFilters}
                onClick={() => setShowFilters(current => !current)}
              >
                ⚙ {tr('필터', 'Filters')}{advancedFilterCount > 0 ? ` ${advancedFilterCount}` : ''} {showFilters ? '▲' : '▼'}
              </Button>
              {hasFilters && <Button size="sm" variant="ghost" onClick={resetFilters}>{tr('초기화', 'Reset')}</Button>}
            </div>
          </div>

          {showFilters && (
            <div className="mt-3 pt-3 border-t border-border space-y-3">
              <FilterRow label={tr('가격', 'Pricing')} options={[
                ['all', tr('전체', 'All')], ['free', tr('무료', 'Free')], ['freemium', tr('부분 무료', 'Freemium')], ['paid', tr('유료', 'Paid')],
              ]} value={pricing} onChange={value => setPricing(value as PricingFilter)} />
              <FilterRow label={tr('시장', 'Markets')} options={[
                ['all', tr('전체', 'All')], ...markets.map(value => [value, value]),
              ]} value={market} onChange={setMarket} />
              <FilterRow label={tr('정렬', 'Sort')} options={[
                ['recommended', tr('추천순', 'Recommended')], ['rating', tr('평점순', 'Rating')], ['likes', tr('좋아요순', 'Likes')], ['reviews', tr('리뷰순', 'Reviews')], ['newest', tr('최신순', 'Newest')],
              ]} value={sort} onChange={value => setSort(value as SortOption)} />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mb-4 text-sm">
          <span className="text-muted">{tr('검색 결과', 'Results')} <strong className="text-white">{visible.length}</strong>{tr('개', '')}</span>
          <span className="text-muted">{tr(`전체 ${tools.length}개`, `${tools.length} total`)}</span>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 gap-4">{[1, 2, 3, 4].map(i => <div key={i} className="h-64 bg-surface border border-border rounded-xl animate-pulse" />)}</div>
        ) : error ? (
          <div className="p-8 border border-danger/40 rounded-xl text-danger text-center">
            {tr('도구 목록을 불러오지 못했습니다.', 'Could not load the tool directory.')}<br />
            <span className="text-muted text-sm">{tr('잠시 후 다시 시도해주세요.', 'Please try again shortly.')}</span>
          </div>
        ) : visible.length ? (
          <div className="grid md:grid-cols-2 gap-4">{visible.map(tool => <AIToolCard key={tool.id} tool={tool} />)}</div>
        ) : (
          <div className="p-12 border border-border rounded-xl text-muted text-center">
            {tr('조건에 맞는 도구가 없습니다.', 'No tools match these filters.')}<br />
            <Button variant="ghost" className="mt-3" onClick={resetFilters}>{tr('필터 초기화', 'Reset filters')}</Button>
          </div>
        )}
      </section>
    </main>
  )
}

function FilterRow({ label, options, value, onChange }: { label: string; options: string[][]; value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid sm:grid-cols-[72px_1fr] gap-2 sm:items-center">
      <div className="text-xs font-mono text-muted">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map(([option, optionLabel]) => (
          <Button key={option} type="button" size="sm" variant={value === option ? 'primary' : 'secondary'} onClick={() => onChange(option)}>
            {optionLabel}
          </Button>
        ))}
      </div>
    </div>
  )
}
