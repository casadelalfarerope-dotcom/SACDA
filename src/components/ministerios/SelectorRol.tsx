'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cambiarRolIntegrante } from '@/app/actions/ministerios'
import Select from '@/components/ui/Select'

type Rol = 'lider' | 'ayudante' | null

// Cambiar el rol de un integrante (como los administradores de un grupo de WhatsApp).
export default function SelectorRol({ grupoId, personaId, rol, nombre }: { grupoId: string; personaId: string; rol: Rol; nombre: string }) {
  const router = useRouter()
  const [valor, setValor] = useState<string>(rol ?? '')
  const [error, setError] = useState('')
  const [pendiente, iniciar] = useTransition()
  return (
    <span className="flex flex-col items-end gap-0.5">
      <Select variante="pildora" aria-label={`Rol de ${nombre}`} value={valor} disabled={pendiente}
        onChange={(e) => {
          const nuevo = e.target.value
          const anterior = valor
          setValor(nuevo); setError('')
          iniciar(async () => {
            const res = await cambiarRolIntegrante(grupoId, personaId, (nuevo || null) as Rol)
            if (res.error) { setError(res.error); setValor(anterior) } else router.refresh()
          })
        }}
        style={{
          background: valor === 'lider' ? 'color-mix(in srgb, var(--accent) 16%, transparent)' : valor === 'ayudante' ? 'color-mix(in srgb, #30b0c7 16%, transparent)' : 'var(--fill)',
          color: valor === 'lider' ? 'var(--accent)' : valor === 'ayudante' ? '#1f8a9c' : 'var(--foreground)',
        }}
        options={[{ value: '', label: 'Integrante' }, { value: 'ayudante', label: 'Ayudante' }, { value: 'lider', label: 'Líder' }]} />
      {error && <span role="alert" className="text-[11px] max-w-[200px] text-right" style={{ color: 'var(--error)' }}>{error}</span>}
    </span>
  )
}
