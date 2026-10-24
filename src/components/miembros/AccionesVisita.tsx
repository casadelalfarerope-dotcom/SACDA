'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { actualizarVisitaPastoral } from '@/app/actions/asistencia'

// Marcar una visita pastoral como realizada (con una nota de cómo le fue) o cancelarla.
export default function AccionesVisita({ id }: { id: string }) {
  const router = useRouter()
  const [nota, setNota] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [error, setError] = useState('')
  const [pendiente, iniciar] = useTransition()
  const ejecutar = (estado: 'realizada' | 'cancelada') => iniciar(async () => {
    const res = await actualizarVisitaPastoral(id, estado, estado === 'realizada' ? nota : undefined)
    if (res.error) setError(res.error); else router.refresh()
  })

  if (!abierto) {
    return (
      <span className="flex gap-3 mt-1.5">
        <button type="button" onClick={() => setAbierto(true)} className="text-[13px] font-semibold" style={{ color: 'var(--accent)' }}>Marcar realizada</button>
        <button type="button" disabled={pendiente} onClick={() => confirm('¿Cancelar esta visita?') && ejecutar('cancelada')} className="text-[13px]" style={{ color: 'var(--muted)' }}>Cancelar</button>
      </span>
    )
  }
  return (
    <form className="flex flex-wrap gap-2 mt-1.5" onSubmit={(e) => { e.preventDefault(); ejecutar('realizada') }}>
      <input autoFocus value={nota} onChange={(e) => setNota(e.target.value)} maxLength={300} placeholder="¿Cómo le fue? (opcional)" aria-label="Nota de la visita"
        className="flex-1 min-w-[12rem] h-9 px-3 rounded-[10px] text-[14px] outline-none border border-transparent" style={{ background: 'var(--fill)', color: 'var(--foreground)' }} />
      <button type="submit" disabled={pendiente} className="h-9 px-3 rounded-full text-[13px] font-semibold" style={{ background: 'var(--accent)', color: 'var(--accent-foreground)' }}>Guardar</button>
      {error && <span role="alert" className="text-[12px] w-full" style={{ color: 'var(--error)' }}>{error}</span>}
    </form>
  )
}
