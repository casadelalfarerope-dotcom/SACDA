import { cn } from '@/lib/utils'
import { type InputHTMLAttributes, useId } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export default function Input({ label, error, hint, className, id, ...props }: InputProps) {
  const autoId = useId()
  const inputId = id ?? autoId

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-[13px] font-medium"
          style={{ color: 'var(--muted)' }}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'w-full h-11 px-3.5 rounded-[10px] text-[15px] outline-none border transition-shadow',
          'placeholder:text-[color:var(--muted)]',
          error ? 'border-[color:var(--error)]' : 'border-transparent',
          className
        )}
        style={{ background: 'var(--fill)', color: 'var(--foreground)' }}
        {...props}
      />
      {error && <p className="text-xs" style={{ color: 'var(--destructive)' }}>{error}</p>}
      {hint && !error && <p className="text-xs" style={{ color: 'var(--muted)' }}>{hint}</p>}
    </div>
  )
}
