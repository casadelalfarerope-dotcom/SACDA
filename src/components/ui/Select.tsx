import { cn } from '@/lib/utils'
import { type SelectHTMLAttributes, useId } from 'react'
import { ChevronDown } from 'lucide-react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

export default function Select({ label, error, options, placeholder, className, id, ...props }: SelectProps) {
  const autoId = useId()
  const selectId = id ?? autoId

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={selectId} className="block text-[13px] font-medium"
          style={{ color: 'var(--muted)' }}>
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className={cn(
            'w-full h-11 appearance-none px-3.5 pr-10 rounded-[10px] text-[15px] outline-none border transition-shadow cursor-pointer',
            error ? 'border-[color:var(--error)]' : 'border-transparent',
            className
          )}
          style={{ background: 'var(--fill)', color: 'var(--foreground)' }}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: 'var(--muted)' }} />
      </div>
      {error && <p className="text-xs" style={{ color: 'var(--destructive)' }}>{error}</p>}
    </div>
  )
}
