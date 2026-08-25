'use client'

import { useTransition } from 'react'
import { actualizarSeguimientoVisita } from '@/app/actions/miembros'
import type { EstadoSeguimiento } from '@/types/database'

const opciones: { value: EstadoSeguimiento; label: string }[] = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'contactado', label: 'Contactado' },
  { value: 'regular', label: 'Regular' },
  { value: 'inactivo', label: 'Inactivo' },
]

const colores: Record<string, string> = {
  pendiente: '#f59e0b',
  contactado: 'var(--foreground)',
  regular: '#22c55e',
  inactivo: 'var(--muted)',
}

export default function CambiarEstadoVisita({
  id, estadoActual, volvio,
}: { id: string; estadoActual: EstadoSeguimiento; volvio: boolean }) {
  const [isPending, startTransition] = useTransition()

  return (
    <select
      value={estadoActual}
      disabled={isPending}
      onChange={(e) => {
        const nuevo = e.target.value as EstadoSeguimiento
        startTransition(async () => { await actualizarSeguimientoVisita(id, { estado: nuevo, volvio }) })
      }}
      className="text-xs px-2 py-1 rounded-xl border outline-none disabled:opacity-50 transition-opacity"
      style={{
        background: 'var(--surface-secondary)',
        borderColor: 'var(--border)',
        color: colores[estadoActual] ?? 'var(--foreground)',
        fontWeight: 500,
      }}>
      {opciones.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}
