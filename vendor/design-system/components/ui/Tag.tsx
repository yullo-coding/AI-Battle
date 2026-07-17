import { ReactNode } from 'react'

interface TagProps {
  children: ReactNode
  color?: 'accent' | 'muted' | 'danger' | 'ai' | 'human' | 'white'
  className?: string
}

const colorStyles = {
  accent: 'text-accent',
  muted:  'text-muted',
  danger: 'text-danger',
  ai:     'text-ai',
  human:  'text-human',
  white:  'text-white',
}

export default function Tag({ children, color = 'muted', className = '' }: TagProps) {
  return (
    <span className={`tag ${colorStyles[color]} ${className}`}>
      {children}
    </span>
  )
}
