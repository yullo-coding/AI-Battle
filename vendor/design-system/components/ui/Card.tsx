import { ReactNode } from 'react'

type Glow = 'none' | 'green' | 'red' | 'ai' | 'human'

interface CardProps {
  children: ReactNode
  glow?: Glow
  hover?: boolean
  className?: string
}

const glowStyles: Record<Glow, string> = {
  none:  '',
  green: 'glow-green',
  red:   'glow-red',
  ai:    'glow-ai',
  human: 'glow-human',
}

export default function Card({ children, glow = 'none', hover = false, className = '' }: CardProps) {
  return (
    <div
      className={[
        'bg-surface border border-border rounded-xl p-6',
        glowStyles[glow],
        hover ? 'card-hover' : '',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}
