'use client'
import { hoyLima } from '@/lib/utils'

import { useState, useTransition } from 'react'
import { UserPlus } from 'lucide-react'
import { asignarRol } from '@/app/actions/roles'
import Button from '@/components/ui/Button'
import BuscadorPersona from '@/components/ui/BuscadorPersona'
import Select from '@/components/ui/Select'

interface Persona { id: string; nombre_completo: string }
interface Rol { id: string; nombre: string }

const sel = {
  background: 'var(--surface-secondary)',
  border: '1px solid var(--border)',
  color: 'var(--foreground)',
}

export default function AsignarRolForm({ personas, roles }: { personas: Persona[]; roles: Rol[] }) {
  const [abierto, setAbierto] = useState(false)
  const [personaId, setPersonaId] = useState('')
  const [rolId, setRolId] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    const hoy = hoyLima()
    startTransition(async () => {
      const res = await asignarRol(personaId, rolId, hoy)
      if (res.error) { setMsg({ ok: false, text: res.error }); return }
      setMsg({ ok: true, text: 'Rol asignado correctamente.' })
      setPersonaId('')
      setRolId('')
      setTimeout(() => { setAbierto(false); setMsg(null) }, 1500)
    })
  }

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)}
        className="inline-flex items-center gap-2 h-10 px-5 rounded-full text-[14px] font-semibold text-white transition-[filter] hover:brightness-105"
        style={{ background: 'var(--accent)' }}>
        <UserPlus size={16} aria-hidden="true" /> Asignar rol
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit}
      className="grid sm:grid-cols-2 items-start gap-3 p-4 rounded-2xl border animate-fade"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div>
        <BuscadorPersona label="Persona" required value={personaId} onChange={setPersonaId}
          personas={personas.map((p) => ({ id: p.id, nombre: p.nombre_completo }))} />
      </div>
      <div>
        <Select label="Rol" required value={rolId} onChange={(e) => setRolId(e.target.value)} placeholder="Selecciona"
          options={roles.map((r) => ({ value: r.id, label: r.nombre.replace(/_/g, ' ') }))} />
      </div>
      <div className="sm:col-span-2 flex justify-end gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => { setAbierto(false); setMsg(null) }}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" loading={isPending} disabled={!personaId || !rolId}>
          Asignar
        </Button>
      </div>
      {msg && (
        <p className="sm:col-span-2 text-sm" style={{ color: msg.ok ? 'var(--success)' : 'var(--error)' }}>
          {msg.text}
        </p>
      )}
    </form>
  )
}
