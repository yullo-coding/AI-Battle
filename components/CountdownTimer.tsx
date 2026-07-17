'use client'

import { useState, useEffect } from 'react'
import { useLocale } from '@/components/LocaleProvider'

interface CountdownTimerProps {
  endAt: string
  onEnd?: () => void
  compact?: boolean
}

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
  total: number
}

function calcTimeLeft(endAt: string): TimeLeft {
  const diff = new Date(endAt).getTime() - Date.now()
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 }
  return {
    total: diff,
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

export default function CountdownTimer({ endAt, onEnd, compact = false }: CountdownTimerProps) {
  const { tr } = useLocale()
  const [time, setTime] = useState<TimeLeft>(calcTimeLeft(endAt))

  useEffect(() => {
    const id = setInterval(() => {
      const t = calcTimeLeft(endAt)
      setTime(t)
      if (t.total <= 0) {
        clearInterval(id)
        onEnd?.()
      }
    }, 1000)
    return () => clearInterval(id)
  }, [endAt, onEnd])

  if (time.total <= 0) {
    if (compact) return <span className="text-xs text-accent font-mono">{tr('결과 확인 가능', 'Result ready')}</span>
    return (
      <div className="text-center">
        <div className="text-2xl font-bold text-white mt-1">{tr('결과 확인 가능', 'Result ready')}</div>
      </div>
    )
  }

  if (compact) {
    const parts = []
    if (time.days > 0) parts.push(`${time.days}${tr('일', 'd')}`)
    parts.push(`${String(time.hours).padStart(2,'0')}:${String(time.minutes).padStart(2,'0')}:${String(time.seconds).padStart(2,'0')}`)
    return (
      <div>
        <div className="text-[10px] text-muted font-mono mb-0.5">{tr('남은 시간', 'Time left')}</div>
        <div className="text-sm font-bold font-mono text-accent">{parts.join(' ')}</div>
      </div>
    )
  }

  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-3">
        {time.days > 0 && (
          <>
            <TimeUnit value={time.days} label={tr('일', 'DAYS')} />
            <Colon />
          </>
        )}
        <TimeUnit value={time.hours} label={tr('시', 'HRS')} />
        <Colon />
        <TimeUnit value={time.minutes} label={tr('분', 'MIN')} />
        <Colon />
        <TimeUnit value={time.seconds} label={tr('초', 'SEC')} />
      </div>
    </div>
  )
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-surface border border-border rounded-lg w-16 h-16 flex items-center justify-center font-mono text-2xl font-bold text-accent">
        {String(value).padStart(2, '0')}
      </div>
      <div className="text-muted text-xs mt-1 font-mono">{label}</div>
    </div>
  )
}

function Colon() {
  return <div className="text-accent text-2xl font-bold mb-4">:</div>
}
