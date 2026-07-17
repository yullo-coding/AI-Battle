'use client'

import { TextareaHTMLAttributes, forwardRef } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  maxLength?: number
  currentLength?: number
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, maxLength, currentLength, className = '', ...props },
  ref
) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-sm text-muted font-mono tracking-widest uppercase text-xs">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        className={[
          'w-full px-4 py-3 rounded-lg bg-surface border border-border text-white placeholder:text-[#8A8A8A] focus:border-accent focus:ring-0 transition-all resize-none',
          error ? 'border-danger focus:border-danger' : '',
          className,
        ].join(' ')}
        {...props}
      />
      <div className="flex justify-between items-center">
        {error && <p className="text-xs text-danger">{error}</p>}
        {maxLength && currentLength !== undefined && (
          <p className="text-xs text-muted ml-auto">
            {currentLength} / {maxLength}
          </p>
        )}
      </div>
    </div>
  )
})

export default Textarea
