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
  primary:   'bg-accent text-bg hover:bg-accent-dim',
  secondary: 'bg-surface border border-border text-white hover:border-accent hover:text-accent',
  danger:    'bg-danger/10 border border-danger text-danger hover:bg-danger/20',
  ghost:     'text-muted hover:text-white hover:bg-surface',
  ai:        'bg-ai text-white hover:bg-ai-dim',
  human:     'bg-human text-white hover:bg-human-dim',
}

const sizeStyles: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-8 py-4 text-base',
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
        'rounded font-bold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed',
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
