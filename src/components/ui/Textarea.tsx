import { type TextareaHTMLAttributes, useId } from 'react'

export default function Textarea({ label, hint, id, rows = 3, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string
  hint?: string
}) {
  const autoId = useId()
  const campoId = id ?? autoId
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={campoId} className="block text-[13px] font-medium" style={{ color: 'var(--muted)' }}>
          {label}
        </label>
      )}
      <textarea id={campoId} rows={rows}
        className="w-full px-3.5 py-2.5 rounded-[10px] text-[15px] outline-none border border-transparent resize-y placeholder:text-[color:var(--muted)]"
        style={{ background: 'var(--fill)', color: 'var(--foreground)' }}
        {...props} />
      {hint && <p className="text-xs" style={{ color: 'var(--muted)' }}>{hint}</p>}
    </div>
  )
}
