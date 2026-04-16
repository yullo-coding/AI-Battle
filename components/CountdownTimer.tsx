'use client'

import { useState, useEffect } from 'react'

interface CountdownTimerProps {
  endAt: string
  onEnd?: () => void
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

export default function CountdownTimer({ endAt, onEnd }: CountdownTimerProps) {
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
    return (
      <div className="text-center">
        <div className="tag text-danger">// BATTLE_ENDED</div>
        <div className="text-2xl font-bold text-white mt-1">결과 집계 중...</div>
      </div>
    )
  }

  return (
    <div className="text-center">
      <div className="tag text-muted mb-3">// TIME_REMAINING</div>
      <div className="flex items-center justify-center gap-3">
        {time.days > 0 && (
          <>
            <TimeUnit value={time.days} label="일" />
            <Colon />
          </>
        )}
        <TimeUnit value={time.hours} label="시" />
        <Colon />
        <TimeUnit value={time.minutes} label="분" />
        <Colon />
        <TimeUnit value={time.seconds} label="초" />
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
