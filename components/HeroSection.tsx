'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Button from '@vibe/design-system/components/ui/Button'
import type { UserSession } from '@/lib/types'
import { useLocale } from '@/components/LocaleProvider'

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

interface HeroSectionProps {
  session: UserSession | null
  onAuthClick: () => void
  onLogout: () => void
}

export default function HeroSection({ session, onAuthClick, onLogout }: HeroSectionProps) {
  const { tr } = useLocale()
  const [tickerPos, setTickerPos] = useState(0)
  const tickerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    tickerRef.current = setInterval(() => {
      setTickerPos(p => p - 1)
    }, 25)
    return () => { if (tickerRef.current) clearInterval(tickerRef.current) }
  }, [])

  const itemWidth = 160
  const totalWidth = TICKERS.length * itemWidth
  const offset = ((tickerPos % totalWidth) + totalWidth) % totalWidth
  const stats = [
    { value: '10', label: tr('한국·미국 인기 종목', 'Popular KR & US stocks') },
    { value: 'AI', label: tr('제작자 AI와 직접 대결', 'Battle builder-made AI') },
    { value: '10', label: tr('선택 가능한 거래일', 'Selectable trading days') },
  ]

  return (
    <section className="relative min-h-screen flex flex-col grid-bg scanlines overflow-hidden">
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

          <h1 className="text-4xl md:text-6xl font-black text-white mb-4 leading-tight">
            {tr('당신의 직관이', 'Can your instincts')}<br />
            <span className="gradient-text-battle">{tr('AI를 이길 수 있을까?', 'beat the AI?')}</span>
          </h1>

          <p className="text-muted text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            {tr('사람과 AI 투자 도구의 주가 예측 배틀.', 'A stock prediction battle between people and AI investing tools.')}<br />
            {tr(<><span className="text-white">실제 주가</span>로 승패를 가립니다.</>, <>Winners are decided by <span className="text-white">real market prices</span>.</>)}
          </p>

          {/* Stats */}
          <div className="flex flex-wrap items-center justify-center gap-8 mb-12">
            {stats.map((s, i) => (
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
              <div className="flex items-center gap-3 text-sm font-mono text-muted">
                <span>{tr('안녕하세요,', 'Welcome,')} <span className="text-accent">{session.nickname}</span>{tr('님', '')}</span>
                <Button size="sm" variant="ghost" onClick={onLogout}>{tr('로그아웃', 'Sign out')}</Button>
              </div>
              <Link href="/battle/new"><Button size="lg" pulse>⚔️ {tr('배틀 시작하기', 'Start Battle')}</Button></Link>
            </div>
          ) : (
            <motion.div whileTap={{ scale: 0.97 }} className="inline-block">
              <Button size="lg" pulse onClick={onAuthClick}>⚔️ {tr('지금 참전하기', 'Join the Battle')}</Button>
            </motion.div>
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
