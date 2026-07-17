import Card from '@vibe/design-system/components/ui/Card'
import Badge from '@vibe/design-system/components/ui/Badge'
import type { AITool } from '@/lib/types'

export default function AIToolSelector({ tools, value, onChange }: {
  tools: AITool[]
  value: string
  onChange: (id: string) => void
}) {
  return (
    <section className="mb-5">
      <div className="flex items-end justify-between gap-3 mb-3">
        <div>
          <div className="text-xs font-mono text-muted mb-1">배틀 상대</div>
          <h2 className="text-lg font-black text-white">어떤 투자 도구와 겨룰까요?</h2>
        </div>
        <a href="/tools" className="text-xs text-accent hover:text-white">도구 보기 →</a>
      </div>
      <div className="space-y-2">
        {tools.map(tool => {
          const selected = value === tool.id
          return (
            <button key={tool.id} type="button" onClick={() => onChange(tool.id)} className="w-full text-left">
              <Card className={`p-4 transition-colors ${selected ? 'border-accent bg-accent/[0.06]' : 'hover:border-white/40'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected ? 'border-accent' : 'border-muted'}`}>
                    {selected && <div className="w-2.5 h-2.5 bg-accent rounded-full" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <strong className="text-white">{tool.name}</strong>
                      <Badge variant="accent">무료</Badge>
                    </div>
                    <p className="text-xs text-muted truncate">{tool.tagline}</p>
                  </div>
                </div>
              </Card>
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-[11px] text-muted">현재 자동 배틀은 검증된 기본 분석기부터 제공합니다. 외부 도구 연동은 검증 후 순차 공개됩니다.</p>
    </section>
  )
}
