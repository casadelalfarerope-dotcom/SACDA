'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { entregarTarea } from '@/app/actions/tareas'
import Button from '@/components/ui/Button'

export default function EntregarTareaForm({ tareaId }: { tareaId: string }) {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [notas, setNotas] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const inputStyle = {
    background: 'var(--surface)',
    borderColor: 'var(--border)',
    color: 'var(--foreground)',
  }

  async function handle() {
    if (!url.trim()) { setError('El enlace es obligatorio.'); return }
    setLoading(true)
    setError('')
    const res = await entregarTarea(tareaId, url, notas)
    if (res.error) { setError(res.error); setLoading(false); return }
    setUrl('')
    setNotas('')
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="space-y-3">
      <input
        value={url} onChange={(e) => setUrl(e.target.value)}
        placeholder="https://drive.google.com/... (enlace al archivo)"
        className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
        style={inputStyle}
      />
      <textarea
        value={notas} onChange={(e) => setNotas(e.target.value)}
        placeholder="Notas adicionales (opcional)"
        rows={2}
        className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none resize-none"
        style={inputStyle}
      />
      {error && <p className="text-xs" style={{ color: 'var(--error)' }}>{error}</p>}
      <Button onClick={handle} loading={loading} size="sm">Entregar</Button>
    </div>
  )
}
