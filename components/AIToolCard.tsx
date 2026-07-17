import Link from 'next/link'
import Card from '@vibe/design-system/components/ui/Card'
import Badge from '@vibe/design-system/components/ui/Badge'
import type { AITool } from '@/lib/types'
import { toolAvailability } from '@/lib/aiTools'

export default function AIToolCard({ tool }: { tool: AITool }) {
  const availability = toolAvailability(tool)
  return (
    <Card hover className="h-full flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="w-11 h-11 rounded-xl border border-border bg-surface-2 flex items-center justify-center text-xl shrink-0">
          🤖
        </div>
        <Badge variant={availability.battleReady ? 'accent' : 'muted'} dot>
          {availability.label}
        </Badge>
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="font-black text-white text-lg">{tool.name}</h2>
          {tool.is_featured && <span title="AI Battle 추천">✓</span>}
        </div>
        <p className="text-sm text-muted leading-relaxed">{tool.tagline}</p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs font-mono text-muted">
        <span className="px-2 py-1 rounded bg-white/[0.05]">{tool.pricing === 'free' ? '무료' : tool.pricing === 'freemium' ? '부분 무료' : '유료'}</span>
        <span className="px-2 py-1 rounded bg-white/[0.05]">{tool.supported_markets.join(' · ')}</span>
      </div>

      <div className="pt-3 border-t border-border flex items-center justify-between text-sm">
        <div className="flex gap-4 text-muted">
          <span>♥ {tool.like_count ?? 0}</span>
          <span>★ {tool.average_rating?.toFixed(1) ?? '새 도구'}</span>
          <span>리뷰 {tool.review_count ?? 0}</span>
        </div>
        <Link href={`/tools/${tool.id}`} className="text-accent font-bold hover:text-white transition-colors">
          상세 →
        </Link>
      </div>
    </Card>
  )
}
