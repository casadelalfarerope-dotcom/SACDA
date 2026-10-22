'use client'
import { hoyLima } from '@/lib/utils'

import { useState, useTransition } from 'react'
import { UserPlus } from 'lucide-react'
import { asignarRol } from '@/app/actions/roles'
import Button from '@/components/ui/Button'

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
      className="flex flex-wrap items-end gap-3 p-4 rounded-2xl border animate-fade"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="flex-1 min-w-40">
        <label htmlFor="roles-asignarr-1" className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Persona</label>
        <select id="roles-asignarr-1" value={personaId} onChange={(e) => setPersonaId(e.target.value)} required
          className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={sel}>
          <option value="">Selecciona...</option>
          {personas.map((p) => <option key={p.id} value={p.id}>{p.nombre_completo}</option>)}
        </select>
      </div>
      <div className="flex-1 min-w-40">
        <label htmlFor="roles-asignarr-2" className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Rol</label>
        <select id="roles-asignarr-2" value={rolId} onChange={(e) => setRolId(e.target.value)} required
          className="w-full px-3 py-2 rounded-xl text-sm outline-none capitalize" style={sel}>
          <option value="">Selecciona...</option>
          {roles.map((r) => <option key={r.id} value={r.id}>{r.nombre.replace(/_/g, ' ')}</option>)}
        </select>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => { setAbierto(false); setMsg(null) }}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" loading={isPending} disabled={!personaId || !rolId}>
          Asignar
        </Button>
      </div>
      {msg && (
        <p className="w-full text-sm" style={{ color: msg.ok ? 'var(--success)' : 'var(--error)' }}>
          {msg.text}
        </p>
      )}
    </form>
  )
}
