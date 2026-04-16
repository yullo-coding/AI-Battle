'use client'

import { motion } from 'framer-motion'

interface ScoreRow {
  roundId: string
  stockName: string
  stockSymbol: string
  humanWins: number
  humanTotal: number
  aiWon: boolean
  endAt: string
}

interface LeaderboardTableProps {
  rows: ScoreRow[]
  humanTotal: { wins: number; total: number }
  aiTotal: { wins: number; total: number }
}

export default function LeaderboardTable({ rows, humanTotal, aiTotal }: LeaderboardTableProps) {
  const humanWinRate = humanTotal.total > 0
    ? Math.round((humanTotal.wins / humanTotal.total) * 100)
    : 0
  const aiWinRate = aiTotal.total > 0
    ? Math.round((aiTotal.wins / aiTotal.total) * 100)
    : 0

  const humanWinning = humanWinRate > aiWinRate

  return (
    <div className="space-y-8">
      {/* Scoreboard */}
      <div className="grid grid-cols-2 gap-4">
        <ScoreCard
          label="인간 통합 전적"
          color="human"
          wins={humanTotal.wins}
          total={humanTotal.total}
          winRate={humanWinRate}
          winning={humanWinning}
        />
        <ScoreCard
          label="AI (Claude) 전적"
          color="ai"
          wins={aiTotal.wins}
          total={aiTotal.total}
          winRate={aiWinRate}
          winning={!humanWinning}
        />
      </div>

      {/* Win rate bar */}
      <div className="bg-surface rounded-xl p-4 border border-border">
        <div className="flex justify-between text-xs font-mono mb-2">
          <span className="text-human">인간 {humanWinRate}%</span>
          <span className="text-ai">AI {aiWinRate}%</span>
        </div>
        <div className="h-3 bg-border rounded-full overflow-hidden flex">
          <div
            className="bg-human transition-all duration-1000"
            style={{ width: `${humanWinRate}%` }}
          />
          <div
            className="bg-ai transition-all duration-1000"
            style={{ width: `${aiWinRate}%` }}
          />
        </div>
      </div>

      {/* Round history */}
      {rows.length > 0 && (
        <div>
          <div className="tag text-muted mb-4">// BATTLE_HISTORY</div>
          <div className="space-y-3">
            {rows.map((row, i) => (
              <motion.div
                key={row.roundId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4 bg-surface border border-border rounded-lg px-4 py-3"
              >
                <div className="flex-1">
                  <div className="text-sm font-bold text-white">{row.stockName}</div>
                  <div className="text-xs text-muted font-mono">{row.stockSymbol}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted mb-1">인간</div>
                  <div className={`text-sm font-bold font-mono ${
                    row.humanTotal > 0 && row.humanWins / row.humanTotal >= 0.5 ? 'text-win' : 'text-lose'
                  }`}>
                    {row.humanWins}/{row.humanTotal}
                  </div>
                </div>
                <div className="text-muted">vs</div>
                <div className="text-center">
                  <div className="text-xs text-muted mb-1">AI</div>
                  <div className={`text-sm font-bold font-mono ${row.aiWon ? 'text-win' : 'text-lose'}`}>
                    {row.aiWon ? '승' : '패'}
                  </div>
                </div>
                <div className="text-xs text-muted font-mono">
                  {new Date(row.endAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {rows.length === 0 && (
        <div className="text-center py-12 text-muted">
          <div className="text-4xl mb-3">⚔️</div>
          <div>아직 종료된 배틀이 없습니다.</div>
        </div>
      )}
    </div>
  )
}

function ScoreCard({
  label, color, wins, total, winRate, winning
}: {
  label: string
  color: 'human' | 'ai'
  wins: number
  total: number
  winRate: number
  winning: boolean
}) {
  return (
    <div className={`bg-surface border rounded-xl p-6 text-center transition-all ${
      winning ? `border-${color} glow-${color}` : 'border-border'
    }`}>
      {winning && <div className="tag text-xs mb-2" style={{ color: color === 'human' ? '#0EA5E9' : '#7C3AED' }}>WINNING</div>}
      <div className="tag mb-2" style={{ color: color === 'human' ? '#0EA5E9' : '#7C3AED' }}>{label}</div>
      <div className="text-4xl font-black font-mono text-white mb-1">{winRate}%</div>
      <div className="text-muted text-sm font-mono">{wins}승 / {total}전</div>
    </div>
  )
}
