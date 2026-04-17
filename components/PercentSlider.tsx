'use client'

import { useRef } from 'react'
import { motion } from 'framer-motion'

interface PercentSliderProps {
  value: number
  onChange: (v: number) => void
}

const MIN = -15
const MAX = 15
const STEP = 0.5

function toPct(v: number) {
  return ((v - MIN) / (MAX - MIN)) * 100
}

export default function PercentSlider({ value, onChange }: PercentSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const thumbPct = toPct(value) // 0 ~ 100
  const centerPct = toPct(0)   // 50

  const fillLeft = Math.min(thumbPct, centerPct)
  const fillWidth = Math.abs(thumbPct - centerPct)
  const isPositive = value > 0
  const isNegative = value < 0

  return (
    <div className="space-y-6">
      {/* Big value display */}
      <div className="text-center py-4">
        <motion.div
          key={value}
          initial={{ scale: 0.9, opacity: 0.7 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.1 }}
          className={`text-7xl font-black font-mono ${
            isPositive ? 'text-up' : isNegative ? 'text-down' : 'text-accent'
          }`}
        >
          {value > 0 ? '+' : ''}{value.toFixed(1)}%
        </motion.div>
        <div className="text-muted text-sm mt-2 font-mono">
          {isPositive ? '▲ 상승 예측' : isNegative ? '▼ 하락 예측' : '─ 보합 예측'}
        </div>
      </div>

      {/* Slider track */}
      <div className="px-2 py-4">
        <div className="relative h-8 flex items-center" ref={trackRef}>
          {/* Background track */}
          <div className="absolute left-0 right-0 h-2 bg-border rounded-full" />

          {/* Fill from center */}
          <div
            className={`absolute h-2 rounded-full transition-all duration-75 ${
              isPositive ? 'bg-up' : isNegative ? 'bg-down' : 'bg-accent'
            }`}
            style={{
              left: `${fillLeft}%`,
              width: `${fillWidth}%`,
            }}
          />

          {/* Center tick */}
          <div className="absolute left-1/2 -translate-x-1/2 w-0.5 h-4 bg-muted/40 rounded-full pointer-events-none z-10" />

          {/* Native input (handles interaction) */}
          <input
            type="range"
            min={MIN}
            max={MAX}
            step={STEP}
            value={value}
            onChange={e => onChange(Number(e.target.value))}
            className="absolute inset-0 w-full opacity-0 cursor-pointer z-20 h-full"
          />

          {/* Visual thumb */}
          <div
            className={`absolute w-6 h-6 rounded-full border-2 border-bg shadow-lg pointer-events-none z-10 transition-all duration-75 ${
              isPositive ? 'bg-up' : isNegative ? 'bg-down' : 'bg-accent'
            }`}
            style={{
              left: `calc(${thumbPct}% - 12px)`,
              boxShadow: isPositive
                ? '0 0 12px rgba(0,255,136,0.5)'
                : isNegative
                ? '0 0 12px rgba(255,68,68,0.5)'
                : '0 0 12px rgba(0,255,136,0.4)',
            }}
          />
        </div>

        {/* Labels */}
        <div className="flex justify-between text-xs font-mono mt-3">
          <span className="text-down font-bold">-15%</span>
          <span className="text-muted">0%</span>
          <span className="text-up font-bold">+15%</span>
        </div>
      </div>

      {/* Preset buttons */}
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
