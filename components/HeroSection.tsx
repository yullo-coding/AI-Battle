'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import type { UserSession } from '@/lib/types'

const TICKERS = [
  { symbol: 'NVDA', value: '+4.2%', up: true },
  { symbol: '삼성전자', value: '-1.8%', up: false },
  { symbol: 'TSLA', value: '+7.1%', up: true },
  { symbol: 'SK하이닉스', value: '+2.3%', up: true },
  { symbol: 'AAPL', value: '-0.5%', up: false },
  { symbol: 'NAVER', value: '+3.6%', up: true },
  { symbol: 'META', value: '+5.9%', up: true },
  { symbol: '카카오', value: '-2.1%', up: false },
]

const STATS = [
  { value: '73%', label: '개인투자자 손실 비율' },
  { value: 'AI', label: 'Claude Sonnet 4.6 대전' },
  { value: '1~7일', label: '유저 선택 배틀 기간' },
]

interface HeroSectionProps {
  session: UserSession | null
  onAuthClick: () => void
}

export default function HeroSection({ session, onAuthClick }: HeroSectionProps) {
  const [time, setTime] = useState('')
  const [tickerPos, setTickerPos] = useState(0)
  const tickerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const updateTime = () => {
      setTime(new Date().toLocaleTimeString('ko-KR', {
        hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'
      }))
    }
    updateTime()
    const id = setInterval(updateTime, 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    tickerRef.current = setInterval(() => {
      setTickerPos(p => p - 1)
    }, 25)
    return () => { if (tickerRef.current) clearInterval(tickerRef.current) }
  }, [])

  const itemWidth = 160
  const totalWidth = TICKERS.length * itemWidth
  const offset = ((tickerPos % totalWidth) + totalWidth) % totalWidth

  return (
    <section className="relative min-h-screen flex flex-col grid-bg scanlines overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface/50 relative z-10">
        <div className="font-mono text-xs text-muted">
          <span className="text-accent">AI_BATTLE</span>
          <span className="mx-2">//</span>
          <span>v1.0.0</span>
        </div>
        <div className="font-mono text-xs text-accent">{time}</div>
      </div>

      {/* Ticker */}
      <div className="relative overflow-hidden border-b border-border bg-surface/30 py-2">
        <div
          className="flex gap-0 whitespace-nowrap"
          style={{ transform: `translateX(${-offset}px)`, transition: 'none', width: `${totalWidth * 2}px` }}
        >
          {[...TICKERS, ...TICKERS].map((t, i) => (
            <div key={i} className="inline-flex items-center gap-2 px-6" style={{ width: itemWidth }}>
              <span className="font-mono text-xs text-muted">{t.symbol}</span>
              <span className={`font-mono text-xs font-bold ${t.up ? 'text-up' : 'text-down'}`}>{t.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main hero content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="tag text-accent mb-6">// HUMAN_VS_AI_INVESTMENT_BATTLE</div>

          <h1 className="text-4xl md:text-6xl font-black text-white mb-4 leading-tight">
            당신의 직관이<br />
            <span className="gradient-text-battle">AI를 이길 수 있을까?</span>
          </h1>

          <p className="text-muted text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Claude AI와 주식 방향 예측 배틀.<br />
            <span className="text-white">실제 주가</span>로 승패를 가린다.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap items-center justify-center gap-8 mb-12">
            {STATS.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="text-center"
              >
                <div className="text-2xl font-black text-accent font-mono">{s.value}</div>
                <div className="text-xs text-muted mt-1">{s.label}</div>
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          {session ? (
            <div className="flex flex-col items-center gap-3">
              <div className="text-sm text-muted font-mono">
                안녕하세요, <span className="text-accent">{session.nickname}</span>님
              </div>
              <a
                href="/battle/new"
                className="px-10 py-4 bg-accent text-bg font-bold text-lg rounded-xl btn-pulse hover:bg-accent-dim transition-colors"
              >
                ⚔️ 배틀 시작하기
              </a>
            </div>
          ) : (
            <motion.button
              onClick={onAuthClick}
              whileTap={{ scale: 0.97 }}
              className="px-10 py-4 bg-accent text-bg font-bold text-lg rounded-xl btn-pulse hover:bg-accent-dim transition-colors"
            >
              ⚔️ 지금 참전하기
            </motion.button>
          )}
        </motion.div>
      </div>

      {/* VS graphic */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
        <div className="text-[20rem] font-black text-white select-none">VS</div>
      </div>
    </section>
  )
}
