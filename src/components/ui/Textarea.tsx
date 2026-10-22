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
        <label htmlFor={campoId} className="block text-sm font-medium" style={{ color: 'var(--foreground)' }}>
          {label}
        </label>
      )}
      <textarea id={campoId} rows={rows}
        className="w-full px-4 py-3 rounded-xl text-sm outline-none border resize-y border-[color:var(--border)] focus:border-[color:var(--accent)] placeholder:text-[color:var(--muted)]"
        style={{ background: 'var(--surface)', color: 'var(--foreground)' }}
        {...props} />
      {hint && <p className="text-xs" style={{ color: 'var(--muted)' }}>{hint}</p>}
    </div>
  )
}
