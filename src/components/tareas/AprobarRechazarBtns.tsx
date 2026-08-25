'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle } from 'lucide-react'
import { aprobarTarea, rechazarTarea } from '@/app/actions/tareas'
import Button from '@/components/ui/Button'

export default function AprobarRechazarBtns({ tareaId }: { tareaId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState<'aprobar' | 'rechazar' | null>(null)
  const [showRechazo, setShowRechazo] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')

  async function aprobar() {
    setLoading('aprobar')
    const res = await aprobarTarea(tareaId)
    if (res.error) { setError(res.error); setLoading(null); return }
    router.refresh()
    setLoading(null)
  }

  async function rechazar() {
    if (!feedback.trim()) { setError('Escribe el motivo de rechazo.'); return }
    setLoading('rechazar')
    const res = await rechazarTarea(tareaId, feedback)
    if (res.error) { setError(res.error); setLoading(null); return }
    router.refresh()
    setLoading(null)
  }

  return (
    <div className="p-4 rounded-2xl border space-y-3" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>Revisión</p>

      {!showRechazo ? (
        <div className="flex gap-3">
          <Button onClick={aprobar} loading={loading === 'aprobar'} className="flex-1 gap-2">
            <CheckCircle size={15} /> Aprobar
          </Button>
          <button onClick={() => setShowRechazo(true)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-opacity hover:opacity-70"
            style={{ borderColor: 'var(--error)', color: 'var(--error)', background: 'var(--surface)' }}>
            <XCircle size={15} /> Rechazar
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <textarea
            value={feedback} onChange={(e) => setFeedback(e.target.value)}
            placeholder="Motivo del rechazo..."
            rows={3}
            className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none resize-none"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
          />
          {error && <p className="text-xs" style={{ color: 'var(--error)' }}>{error}</p>}
          <div className="flex gap-3">
            <button onClick={() => { setShowRechazo(false); setFeedback(''); setError('') }}
              className="flex-1 px-4 py-2 rounded-xl text-sm font-medium border"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)', background: 'var(--surface)' }}>
              Cancelar
            </button>
            <button onClick={rechazar} disabled={loading === 'rechazar'}
              className="flex-1 px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-50"
              style={{ background: 'var(--error)' }}>
              {loading === 'rechazar' ? '...' : 'Confirmar rechazo'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
