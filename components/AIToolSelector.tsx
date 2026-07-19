'use client'

import { useState } from 'react'
import Link from 'next/link'
import Card from '@vibe/design-system/components/ui/Card'
import Badge from '@vibe/design-system/components/ui/Badge'
import Button from '@vibe/design-system/components/ui/Button'
import type { AITool } from '@/lib/types'
import { localizedTool, toolAvailability } from '@/lib/aiTools'
import { useLocale } from '@/components/LocaleProvider'

export default function AIToolSelector({ tools, value, onChange, onContinue }: {
  tools: AITool[]
  value: string
  onChange: (id: string) => void
  onContinue?: () => void
}) {
  const { locale, tr } = useLocale()
  const [showReviewTools, setShowReviewTools] = useState(false)
  const battleTools = tools.filter(tool => toolAvailability(tool).battleReady)
  const reviewTools = tools.filter(tool => !toolAvailability(tool).battleReady)
  const selectedTool = battleTools.find(tool => tool.id === value)
  const selectedCopy = selectedTool ? localizedTool(selectedTool, locale) : null

  return (
    <section className="space-y-5 pb-24 sm:pb-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-mono text-accent mb-2">{tr('AI 투자 서비스 선택', 'Choose an AI Investing Service')}</div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">{tr('먼저 대결할 AI를 고르세요', 'Choose your AI opponent first')}</h1>
          <p className="text-sm text-muted mt-2 leading-relaxed">{tr('실제로 예측 API가 연결된 AI만 선택할 수 있어요.', 'Only AIs with a verified prediction API can enter a battle.')}</p>
        </div>
        <Link href="/tools" className="shrink-0">
          <Button variant="secondary" size="sm">{tr('전체 AI 도구 둘러보기', 'Browse all AI tools')} →</Button>
        </Link>
      </div>

      <div className="rounded-2xl border border-accent/35 bg-gradient-to-br from-accent/[0.08] via-surface to-surface p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs font-mono font-bold text-accent">{tr('지금 대결 가능', 'BATTLE READY NOW')}</div>
            <p className="mt-1 text-xs text-muted">{tr(`${battleTools.length}개의 검증된 AI`, `${battleTools.length} verified AI${battleTools.length === 1 ? '' : 's'}`)}</p>
          </div>
          {battleTools.length === 1 && <Badge variant="accent">{tr('현재 추천', 'Recommended')}</Badge>}
        </div>

        {battleTools.length > 0 ? (
          <div
            role="radiogroup"
            aria-label={tr('배틀할 AI 선택', 'Choose an AI opponent')}
            className={`grid gap-3 ${battleTools.length > 1 ? 'md:grid-cols-2' : 'grid-cols-1'}`}
          >
            {battleTools.map(tool => {
              const selected = value === tool.id
              const copy = localizedTool(tool, locale)
              const pricing = pricingLabel(tool, tr)
              const method = tool.integration_type === 'built_in'
                ? tr('규칙 기반 분석', 'Rule-based analysis')
                : tr('검증된 API 연동', 'Verified API')

              return (
                <Button
                  key={tool.id}
                  type="button"
                  variant="ghost"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onChange(tool.id)}
                  className="block h-full w-full p-0 text-left"
                >
                  <Card className={`h-full p-5 sm:p-6 transition-all ${selected ? 'border-accent bg-accent/[0.08]' : 'hover:border-white/60'}`}>
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${selected ? 'border-accent bg-accent/10' : 'border-muted'}`} aria-hidden="true">
                        {selected && <div className="h-3 w-3 rounded-full bg-accent" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="text-base text-white sm:text-lg">{copy.name}</strong>
                          {selected && <Badge variant="accent">{tr('선택됨', 'Selected')}</Badge>}
                        </div>
                        <p className="mt-2 text-sm text-muted leading-relaxed">{copy.tagline}</p>

                        <div className="mt-5 grid gap-2 sm:grid-cols-3">
                          <ToolFact label={tr('분석 방식', 'Method')} value={method} />
                          <ToolFact label={tr('이용 비용', 'Cost')} value={pricing} />
                          <ToolFact label={tr('지원 시장', 'Markets')} value={tool.supported_markets.join(' · ')} />
                        </div>

                        {(tool.review_count ?? 0) > 0 && (
                          <div className="mt-4 text-xs text-muted">
                            ★ {tool.average_rating?.toFixed(1) ?? '-'} · {tr(`리뷰 ${tool.review_count}개`, `${tool.review_count} reviews`)}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </Button>
              )
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-bg/40 p-6 text-center text-sm text-muted">
            {tr('현재 배틀 가능한 AI가 없습니다.', 'No verified AI is currently available for battle.')}
          </div>
        )}
      </div>

      {reviewTools.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-black text-white">{tr('배틀 연동 준비 중인 AI', 'AIs awaiting battle integration')}</h2>
                <Badge variant="muted">{reviewTools.length}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted leading-relaxed">
                {tr('지금은 상세 정보와 리뷰를 볼 수 있고, API 검증 후 선택할 수 있어요.', 'Explore details and reviews now. Battle selection opens after API verification.')}
              </p>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={() => setShowReviewTools(current => !current)} aria-expanded={showReviewTools}>
              {showReviewTools ? tr('목록 접기', 'Hide tools') : tr('도구 둘러보기', 'Browse tools')} {showReviewTools ? '↑' : '↓'}
            </Button>
          </div>

          {showReviewTools && (
            <div className="mt-4 grid gap-3 border-t border-border pt-4 md:grid-cols-2">
              {reviewTools.map(tool => {
                const copy = localizedTool(tool, locale)
                return (
                  <Card key={tool.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <strong className="text-sm text-white">{copy.name}</strong>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Badge variant="muted">{tr('리뷰 전용', 'Review only')}</Badge>
                          <Badge variant="muted">{pricingLabel(tool, tr)}</Badge>
                        </div>
                      </div>
                      <Link href={`/tools/${tool.id}`} className="shrink-0">
                        <Button variant="ghost" size="sm">{tr('상세 보기', 'Details')} →</Button>
                      </Link>
                    </div>
                    <p className="mt-3 text-xs text-muted leading-relaxed">{copy.tagline}</p>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {onContinue && (
        <div className="sticky bottom-3 z-30 rounded-2xl border border-accent/35 bg-bg/95 p-3 shadow-2xl backdrop-blur-md sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
          <div className="mb-2 flex items-center justify-between gap-3 px-1 sm:hidden">
            <span className="text-[11px] text-muted">{tr('선택한 AI', 'Selected AI')}</span>
            <strong className="truncate text-xs text-white">{selectedCopy?.name ?? tr('선택 필요', 'Choose one')}</strong>
          </div>
          <Button size="lg" className="w-full" disabled={!selectedTool} onClick={onContinue} pulse={Boolean(selectedTool)}>
            <span className="truncate">
              {selectedCopy
                ? tr(`${selectedCopy.name}로 계속하기`, `Continue with ${selectedCopy.name}`)
                : tr('배틀할 AI를 선택해주세요', 'Choose an AI to continue')}
            </span>
            <span aria-hidden="true">→</span>
          </Button>
        </div>
      )}
    </section>
  )
}

function ToolFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-border bg-bg/45 px-3 py-2.5 sm:block">
      <div className="text-[10px] text-muted">{label}</div>
      <div className="text-xs font-bold text-white sm:mt-1 sm:text-[11px]" title={value}>{value}</div>
    </div>
  )
}

function pricingLabel(tool: AITool, tr: <T>(ko: T, en: T) => T) {
  if (tool.pricing === 'free') return tr('무료', 'Free')
  if (tool.pricing === 'freemium') return tr('부분 무료', 'Freemium')
  return tr('유료', 'Paid')
}
