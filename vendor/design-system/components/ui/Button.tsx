import { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'ai' | 'human'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  pulse?: boolean
  children: ReactNode
}

const variantStyles: Record<Variant, string> = {
  primary:   'bg-accent border-accent text-bg hover:bg-accent-dim hover:border-accent-dim',
  secondary: 'bg-surface border-border text-white hover:border-accent hover:text-accent hover:bg-accent/[0.04]',
  danger:    'bg-danger/10 border border-danger text-danger hover:bg-danger/20',
  ghost:     'text-muted hover:text-white hover:bg-surface border-transparent',
  ai:        'bg-ai border-ai text-white hover:bg-ai-dim hover:border-ai-dim',
  human:     'bg-human border-human text-white hover:bg-human-dim hover:border-human-dim',
}

const sizeStyles: Record<Size, string> = {
  sm: 'min-h-9 px-3 py-2 text-xs',
  md: 'min-h-11 px-5 py-2.5 text-sm',
  lg: 'min-h-[52px] px-8 py-3.5 text-base',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  pulse = false,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        'inline-flex items-center justify-center gap-2 rounded-xl border font-bold leading-none transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
        variantStyles[variant],
        sizeStyles[size],
        pulse ? 'btn-pulse' : '',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </button>
  )
}
