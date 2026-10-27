'use client'

import { useTransition } from 'react'
import { actualizarAusencia } from '@/app/actions/miembros'
import type { EstadoAusencia } from '@/types/database'
import Select from '@/components/ui/Select'

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
    <Select variante="pildora" value={estadoActual} disabled={isPending} aria-label="Estado"
      onChange={(e) => {
        const nuevo = e.target.value as EstadoAusencia
        startTransition(async () => { await actualizarAusencia(id, nuevo) })
      }}
      style={{ color: colores[estadoActual] ?? 'var(--foreground)' }}
      options={opciones} />
  )
}
