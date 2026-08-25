import { cn } from '@/lib/utils'
import { type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export default function Input({ label, error, hint, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium"
          style={{ color: 'var(--foreground)' }}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'w-full px-4 py-3 rounded-xl text-sm outline-none border transition-all',
          'placeholder:text-[color:var(--muted)]',
          error ? 'border-red-500' : 'border-[color:var(--border)] focus:border-[color:var(--accent)]',
          className
        )}
        style={{ background: 'var(--surface)', color: 'var(--foreground)' }}
        {...props}
      />
      {error && <p className="text-xs" style={{ color: 'var(--destructive)' }}>{error}</p>}
      {hint && !error && <p className="text-xs" style={{ color: 'var(--muted)' }}>{hint}</p>}
    </div>
  )
}
