import Link from 'next/link'
import Card from '@vibe/design-system/components/ui/Card'
import Badge from '@vibe/design-system/components/ui/Badge'
import type { AITool } from '@/lib/types'
import { localizedTool, toolAvailability } from '@/lib/aiTools'
import { useLocale } from '@/components/LocaleProvider'

export default function AIToolCard({ tool }: { tool: AITool }) {
  const { locale, tr } = useLocale()
  const availability = toolAvailability(tool)
  const copy = localizedTool(tool, locale)
  const availabilityLabel = availability.battleReady ? tr('배틀 가능', 'Battle ready') : tr('링크·리뷰 전용', 'Review only')
  return (
    <Card hover className="h-full flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="w-11 h-11 rounded-xl border border-border bg-surface-2 flex items-center justify-center text-xl shrink-0">
          🤖
        </div>
        <Badge variant={availability.battleReady ? 'accent' : 'muted'} dot>
          {availabilityLabel}
        </Badge>
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="font-black text-white text-lg">{copy.name}</h2>
          {tool.is_featured && <span title={tr('AI Battle 추천', 'AI Battle pick')}>✓</span>}
        </div>
        <p className="text-sm text-muted leading-relaxed">{copy.tagline}</p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs font-mono text-muted">
        <span className="px-2 py-1 rounded bg-white/[0.05]">{tool.pricing === 'free' ? tr('무료', 'Free') : tool.pricing === 'freemium' ? tr('부분 무료', 'Freemium') : tr('유료', 'Paid')}</span>
        <span className="px-2 py-1 rounded bg-white/[0.05]">{tool.supported_markets.join(' · ')}</span>
      </div>

      <div className="pt-3 border-t border-border flex items-center justify-between text-sm">
        <div className="flex gap-4 text-muted">
          <span>♥ {tool.like_count ?? 0}</span>
          <span>★ {tool.average_rating?.toFixed(1) ?? tr('새 도구', 'New')}</span>
          <span>{tr('리뷰', 'Reviews')} {tool.review_count ?? 0}</span>
        </div>
        <Link href={`/tools/${tool.id}`} className="text-accent font-bold hover:text-white transition-colors">
          {tr('상세', 'Details')} →
        </Link>
      </div>
    </Card>
  )
}
