import { ReactNode } from 'react'

type Variant = 'accent' | 'danger' | 'ai' | 'human' | 'muted'

interface BadgeProps {
  variant?: Variant
  dot?: boolean
  children: ReactNode
  className?: string
}

const variantStyles: Record<Variant, string> = {
  accent: 'border-accent/30 bg-accent/5 text-accent',
  danger: 'border-danger/30 bg-danger/5 text-danger',
  ai:     'border-ai/30 bg-ai/5 text-ai',
  human:  'border-human/30 bg-human/5 text-human',
  muted:  'border-border bg-surface text-muted',
}

const dotColors: Record<Variant, string> = {
  accent: 'bg-accent',
  danger: 'bg-danger',
  ai:     'bg-ai',
  human:  'bg-human',
  muted:  'bg-muted',
}

export default function Badge({ variant = 'accent', dot = false, children, className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full border tag',
        variantStyles[variant],
        className,
      ].join(' ')}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${dotColors[variant]}`} />}
      {children}
    </span>
  )
}
