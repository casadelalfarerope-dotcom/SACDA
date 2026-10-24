'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { guardarMotivoAusencia } from '@/app/actions/asistencia'

// Motivo de la ausencia, editable en línea (enfermedad, viaje, trabajo…).
export default function MotivoAusencia({ id, motivo }: { id: string; motivo: string | null }) {
  const router = useRouter()
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState(motivo ?? '')
  const [error, setError] = useState('')
  const [pendiente, iniciar] = useTransition()

  if (!editando) {
    return (
      <button type="button" onClick={() => setEditando(true)} className="inline-flex items-center gap-1 text-[13px] mt-0.5"
        style={{ color: motivo ? 'var(--muted)' : 'var(--accent)' }}>
        {motivo ? <>Motivo: {motivo}</> : <><Pencil size={12} aria-hidden="true" /> Agregar motivo</>}
      </button>
    )
  }
  return (
    <form className="flex gap-2 mt-1.5" onSubmit={(e) => {
      e.preventDefault()
      iniciar(async () => {
        const res = await guardarMotivoAusencia(id, texto)
        if (res.error) { setError(res.error); return }
        setEditando(false); router.refresh()
      })
    }}>
      <input autoFocus value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={200} placeholder="Ej. Estuvo enfermo"
        aria-label="Motivo de la ausencia" className="flex-1 min-w-0 h-9 px-3 rounded-[10px] text-[14px] outline-none border border-transparent"
        style={{ background: 'var(--fill)', color: 'var(--foreground)' }} />
      <button type="submit" disabled={pendiente} className="h-9 px-3 rounded-full text-[13px] font-semibold"
        style={{ background: 'var(--accent)', color: 'var(--accent-foreground)' }}>Guardar</button>
      {error && <span role="alert" className="text-[12px]" style={{ color: 'var(--error)' }}>{error}</span>}
    </form>
  )
}
