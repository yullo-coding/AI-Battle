'use client'

import { useRef } from 'react'
import { motion } from 'framer-motion'

interface PercentSliderProps {
  value: number
  onChange: (v: number) => void
}

const MIN = -100
const MAX = 100
const STEP = 1

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
          className={`text-5xl font-black font-mono ${
            isPositive ? 'text-up' : isNegative ? 'text-down' : 'text-accent'
          }`}
        >
          {value > 0 ? '+' : ''}{value}%
        </motion.div>
      </div>

      {/* Slider track */}
      <div className="py-2">
        <div className="relative h-8 flex items-center mx-2">
          {/* Background track */}
          <div className="absolute left-0 right-0 h-2 bg-border rounded-full" />

          {/* Fill from center */}
          <div
            className={`absolute h-2 rounded-full transition-all duration-75 ${
              isPositive ? 'bg-up' : isNegative ? 'bg-down' : 'bg-accent'
            }`}
            style={{ left: `${fillLeft}%`, width: `${fillWidth}%` }}
          />

          {/* Center tick */}
          <div className="absolute left-1/2 -translate-x-1/2 w-0.5 h-3 bg-muted/40 rounded-full pointer-events-none z-10" />

          {/* Native input */}
          <input
            type="range"
            min={MIN}
            max={MAX}
            step={STEP}
            value={Math.max(MIN, Math.min(MAX, value))}
            onChange={e => onChange(Number(e.target.value))}
            className="absolute inset-0 w-full opacity-0 cursor-pointer z-20 h-full"
          />

          {/* Visual thumb — clamp position to stay within track */}
          <div
            className={`absolute w-5 h-5 rounded-full border-2 border-bg shadow-lg pointer-events-none z-10 transition-all duration-75 ${
              isPositive ? 'bg-up' : isNegative ? 'bg-down' : 'bg-accent'
            }`}
            style={{
              left: `calc(${Math.max(0, Math.min(100, thumbPct))}% - 10px)`,
              boxShadow: isPositive
                ? '0 0 10px rgba(0,255,136,0.5)'
                : isNegative
                ? '0 0 10px rgba(255,68,68,0.5)'
                : '0 0 10px rgba(0,255,136,0.4)',
            }}
          />
        </div>

        {/* Labels */}
        <div className="flex justify-between text-xs font-mono mt-2 mx-2">
          <span className="text-down">-100%</span>
          <span className="text-muted">0%</span>
          <span className="text-up">+100%</span>
        </div>
      </div>

      {/* Direct input */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => onChange(value - 1)}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-border text-muted hover:border-down hover:text-down transition-colors font-mono text-lg"
        >−</button>
        <div className="relative">
          <input
            type="number"
            step={STEP}
            value={value}
            onChange={e => { const v = Number(e.target.value); if (!isNaN(v)) onChange(v) }}
            className="w-24 bg-bg border border-border rounded-lg px-3 py-2 text-center text-lg font-black font-mono text-white focus:outline-none focus:border-accent transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted font-mono text-sm pointer-events-none">%</span>
        </div>
        <button
          onClick={() => onChange(value + 1)}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-border text-muted hover:border-up hover:text-up transition-colors font-mono text-lg"
        >+</button>
      </div>

      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2 justify-center">
        {[-50, -20, -10, -5, 0, 5, 10, 20, 50].map(preset => (
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
