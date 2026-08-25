'use client'

import { useTransition } from 'react'
import { actualizarAusencia } from '@/app/actions/miembros'
import type { EstadoAusencia } from '@/types/database'

const opciones: { value: EstadoAusencia; label: string }[] = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'contactado', label: 'Contactado' },
  { value: 'resuelto', label: 'Resuelto' },
]

const colores: Record<string, string> = {
  pendiente: '#f59e0b',
  contactado: 'var(--foreground)',
  resuelto: '#22c55e',
}

export default function CambiarEstadoAusencia({
  id, estadoActual,
}: { id: string; estadoActual: EstadoAusencia }) {
  const [isPending, startTransition] = useTransition()

  return (
    <select
      value={estadoActual}
      disabled={isPending}
      onChange={(e) => {
        const nuevo = e.target.value as EstadoAusencia
        startTransition(() => actualizarAusencia(id, nuevo))
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
