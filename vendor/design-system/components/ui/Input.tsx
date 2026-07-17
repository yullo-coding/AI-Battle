'use client'

import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  mono?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, mono = false, className = '', ...props },
  ref
) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-sm text-muted font-mono tracking-widest uppercase text-xs">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={[
          'w-full px-4 py-3 rounded-lg bg-surface-2 border border-border text-white placeholder:text-[#8A8A8A] focus:border-accent focus:ring-0 transition-all',
          mono ? 'font-mono' : '',
          error ? 'border-danger focus:border-danger' : '',
          className,
        ].join(' ')}
        {...props}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
})

export default Input
