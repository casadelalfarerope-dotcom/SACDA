'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { agregarAsignacion } from '@/app/actions/servidores'
import Button from '@/components/ui/Button'

interface Props {
  programaId: string
  roles: { id: string; nombre: string; color: string }[]
  personas: { id: string; nombre_completo: string }[]
}

export default function AsignarServidorForm({ programaId, roles, personas }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rolId, setRolId] = useState('')
  const [personaId, setPersonaId] = useState('')

  const selectStyle = {
    background: 'var(--surface)',
    borderColor: 'var(--border)',
    color: 'var(--foreground)',
  }

  async function handle() {
    if (!rolId || !personaId) { setError('Selecciona rol y persona.'); return }
    setLoading(true)
    setError('')
    const res = await agregarAsignacion({ programa_id: programaId, rol_servicio_id: rolId, persona_id: personaId })
    if (res.error) { setError(res.error); setLoading(false); return }
    setRolId('')
    setPersonaId('')
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <select value={rolId} onChange={(e) => setRolId(e.target.value)}
          className="px-3 py-2.5 rounded-xl border text-sm outline-none"
          style={selectStyle}>
          <option value="">Rol...</option>
          {roles.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
        </select>
        <select value={personaId} onChange={(e) => setPersonaId(e.target.value)}
          className="px-3 py-2.5 rounded-xl border text-sm outline-none"
          style={selectStyle}>
          <option value="">Persona...</option>
          {personas.map((p) => <option key={p.id} value={p.id}>{p.nombre_completo}</option>)}
        </select>
      </div>
      {error && <p className="text-xs" style={{ color: 'var(--error)' }}>{error}</p>}
      <Button onClick={handle} loading={loading} size="sm">Agregar</Button>
    </div>
  )
}
