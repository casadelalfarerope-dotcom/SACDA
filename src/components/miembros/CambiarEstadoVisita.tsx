'use client'

import { useTransition } from 'react'
import { actualizarSeguimientoVisita } from '@/app/actions/miembros'
import type { EstadoSeguimiento } from '@/types/database'
import Select from '@/components/ui/Select'

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
    <Select variante="pildora" value={estadoActual} disabled={isPending} aria-label="Estado"
      onChange={(e) => {
        const nuevo = e.target.value as EstadoSeguimiento
        startTransition(async () => { await actualizarSeguimientoVisita(id, { estado: nuevo, volvio }) })
      }}
      style={{ color: colores[estadoActual] ?? 'var(--foreground)' }}
      options={opciones} />
  )
}
