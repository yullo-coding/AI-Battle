'use client'

import { useRef } from 'react'
import { motion } from 'framer-motion'

interface PercentSliderProps {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
}

export default function PercentSlider({
  value,
  onChange,
  min = -15,
  max = 15,
  step = 0.5,
}: PercentSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null)

  const toPct = (v: number) => ((v - min) / (max - min)) * 100
  const thumbPct  = toPct(value)
  const centerPct = toPct(0)
  const fillLeft  = Math.min(thumbPct, centerPct)
  const fillWidth = Math.abs(thumbPct - centerPct)
  const isPositive = value > 0
  const isNegative = value < 0

  const fillColor = isPositive ? 'bg-up' : isNegative ? 'bg-down' : 'bg-accent'
  const textColor = isPositive ? 'text-up' : isNegative ? 'text-down' : 'text-accent'
  const shadowColor = isPositive
    ? '0 0 12px rgba(0,255,136,0.5)'
    : isNegative
    ? '0 0 12px rgba(255,68,68,0.5)'
    : '0 0 12px rgba(0,255,136,0.4)'

  return (
    <div className="space-y-6">
      <div className="text-center py-4">
        <motion.div
          key={value}
          initial={{ scale: 0.9, opacity: 0.7 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.1 }}
          className={`text-7xl font-black font-mono ${textColor}`}
        >
          {value > 0 ? '+' : ''}{value.toFixed(1)}%
        </motion.div>
        <div className="text-muted text-sm mt-2 font-mono">
          {isPositive ? '▲ 상승 예측' : isNegative ? '▼ 하락 예측' : '─ 보합 예측'}
        </div>
      </div>

      <div className="px-2 py-4">
        <div className="relative h-8 flex items-center" ref={trackRef}>
          <div className="absolute left-0 right-0 h-2 bg-border rounded-full" />
          <div
            className={`absolute h-2 rounded-full transition-all duration-75 ${fillColor}`}
            style={{ left: `${fillLeft}%`, width: `${fillWidth}%` }}
          />
          <div className="absolute left-1/2 -translate-x-1/2 w-0.5 h-4 bg-muted/40 rounded-full pointer-events-none z-10" />
          <input
            type="range"
            min={min} max={max} step={step} value={value}
            onChange={e => onChange(Number(e.target.value))}
            className="absolute inset-0 w-full opacity-0 cursor-pointer z-20 h-full"
          />
          <div
            className={`absolute w-6 h-6 rounded-full border-2 border-bg shadow-lg pointer-events-none z-10 transition-all duration-75 ${fillColor}`}
            style={{ left: `calc(${thumbPct}% - 12px)`, boxShadow: shadowColor }}
          />
        </div>
        <div className="flex justify-between text-xs font-mono mt-3">
          <span className="text-down font-bold">{min}%</span>
          <span className="text-muted">0%</span>
          <span className="text-up font-bold">+{max}%</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        {[-10, -5, -2, -1, 0, 1, 2, 5, 10].map(preset => (
          <button
            key={preset}
            onClick={() => onChange(preset)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all ${
              value === preset
                ? preset > 0
                  ? 'bg-up/20 border-up text-up'
                  : preset < 0
                  ? 'bg-down/20 border-down text-down'
                  : 'bg-accent/20 border-accent text-accent'
                : 'border-border text-muted hover:border-white hover:text-white'
            }`}
          >
            {preset > 0 ? '+' : ''}{preset}%
          </button>
        ))}
      </div>
    </div>
  )
}
