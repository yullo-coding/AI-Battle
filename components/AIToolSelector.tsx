import Link from 'next/link'
import Card from '@vibe/design-system/components/ui/Card'
import Badge from '@vibe/design-system/components/ui/Badge'
import Button from '@vibe/design-system/components/ui/Button'
import type { AITool } from '@/lib/types'
import { toolAvailability } from '@/lib/aiTools'

export default function AIToolSelector({ tools, value, onChange, onContinue }: {
  tools: AITool[]
  value: string
  onChange: (id: string) => void
  onContinue?: () => void
}) {
  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-xs font-mono text-accent mb-2">AI 투자 서비스 선택</div>
          <h1 className="text-2xl font-black text-white">먼저 대결할 AI를 고르세요</h1>
          <p className="text-sm text-muted mt-2">같은 종목과 기간을 보고 AI와 예측 정확도를 겨룹니다.</p>
        </div>
        <Link href="/tools" className="text-xs text-accent hover:text-white shrink-0">전체 도구 →</Link>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {tools.map(tool => {
          const selected = value === tool.id
          const availability = toolAvailability(tool)
          const pricing = tool.pricing === 'free' ? '무료' : tool.pricing === 'freemium' ? '부분 무료' : '유료'
          return (
            <div key={tool.id} className="relative">
              <button
                type="button"
                disabled={!availability.battleReady}
                onClick={() => onChange(tool.id)}
                className={`w-full h-full text-left ${availability.battleReady ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <Card className={`h-full p-5 transition-colors ${selected ? 'border-accent bg-accent/[0.06]' : availability.battleReady ? 'hover:border-white/60' : 'opacity-80'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? 'border-accent' : 'border-muted'}`}>
                      {selected && <div className="w-2.5 h-2.5 bg-accent rounded-full" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <strong className="text-white">{tool.name}</strong>
                        <Badge variant={availability.battleReady ? 'accent' : 'muted'}>{availability.label}</Badge>
                        <Badge variant="muted">{pricing}</Badge>
                      </div>
                      <p className="text-xs text-muted leading-relaxed">{tool.tagline}</p>
                      <p className="text-[11px] text-muted mt-3 font-mono">{tool.supported_markets.join(' · ')}</p>
                    </div>
                  </div>
                </Card>
              </button>
              {!availability.battleReady && (
                <Link href={`/tools/${tool.id}`} className="absolute right-4 bottom-4 text-[11px] text-accent hover:text-white">
                  상세·리뷰 →
                </Link>
              )}
            </div>
          )
        })}
      </div>
      <div className="rounded-xl border border-border bg-surface px-4 py-3 text-xs text-muted leading-relaxed">
        외부 서비스는 먼저 링크·리뷰용으로 공개합니다. 공식 API와 결과 형식이 검증된 서비스부터 배틀 선택을 순차적으로 열어요.
      </div>
      {onContinue && (
        <Button size="lg" className="w-full" disabled={!value} onClick={onContinue}>
          이 AI로 종목 선택하기 →
        </Button>
      )}
    </section>
  )
}
