'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { House } from 'lucide-react'
import { programarVisita } from '@/app/actions/asistencia'

// Botón en cada ausencia para programar una visita pastoral a la casa del hermano.
export default function ProgramarVisita({ personaId, ausenciaId, motivoSugerido, personas, hoy }: {
  personaId: string; ausenciaId?: string; motivoSugerido?: string; personas: { id: string; nombre: string }[]; hoy: string
}) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [fecha, setFecha] = useState(hoy)
  const [responsable, setResponsable] = useState('')
  const [error, setError] = useState('')
  const [hecho, setHecho] = useState(false)
  const [pendiente, iniciar] = useTransition()

  if (hecho) return <span role="status" className="text-[13px] mt-1 inline-block" style={{ color: 'var(--success)' }}>Visita programada.</span>
  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className="inline-flex items-center gap-1 text-[13px] mt-1" style={{ color: 'var(--accent)' }}>
        <House size={12} aria-hidden="true" /> Programar visita
      </button>
    )
  }
  const campo = 'h-9 px-2.5 rounded-[10px] text-[14px] outline-none border border-transparent'
  return (
    <form className="flex flex-wrap items-center gap-2 mt-1.5" onSubmit={(e) => {
      e.preventDefault()
      iniciar(async () => {
        const res = await programarVisita({ persona_id: personaId, fecha, responsable_id: responsable, ausencia_id: ausenciaId, motivo: motivoSugerido })
        if (res.error) { setError(res.error); return }
        setHecho(true); router.refresh()
      })
    }}>
      <input type="date" value={fecha} min={hoy} onChange={(e) => setFecha(e.target.value)} aria-label="Fecha de la visita" className={campo} style={{ background: 'var(--fill)', color: 'var(--foreground)' }} />
      <select value={responsable} onChange={(e) => setResponsable(e.target.value)} aria-label="Quién irá" className={campo} style={{ background: 'var(--fill)', color: 'var(--foreground)' }}>
        <option value="">¿Quién irá?</option>
        {personas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
      </select>
      <button type="submit" disabled={pendiente} className="h-9 px-3 rounded-full text-[13px] font-semibold" style={{ background: 'var(--accent)', color: 'var(--accent-foreground)' }}>Programar</button>
      <button type="button" onClick={() => setAbierto(false)} className="text-[13px]" style={{ color: 'var(--muted)' }}>Cancelar</button>
      {error && <span role="alert" className="text-[12px] w-full" style={{ color: 'var(--error)' }}>{error}</span>}
    </form>
  )
}
