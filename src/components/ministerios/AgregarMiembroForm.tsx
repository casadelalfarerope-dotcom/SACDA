'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus } from 'lucide-react'
import { agregarMiembro } from '@/app/actions/ministerios'
import BuscadorPersona from '@/components/ui/BuscadorPersona'

export default function AgregarMiembroForm({ grupoId }: { grupoId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [personaId, setPersonaId] = useState('')
  const [rol, setRol] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleOpen() {
    setOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await agregarMiembro(grupoId, personaId, rol)
    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }
    setOpen(false)
    setPersonaId('')
    setRol('')
    router.refresh()
    setLoading(false)
  }

  if (!open) {
    return (
      <button onClick={handleOpen}
        className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl border w-full justify-center transition-opacity hover:opacity-70"
        style={{ borderColor: 'var(--border)', color: 'var(--foreground)', background: 'var(--surface-secondary)' }}>
        <UserPlus size={16} />
        Agregar miembro
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
      <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Agregar miembro</p>
      <BuscadorPersona label="Persona" value={personaId} onChange={setPersonaId} autoFocus />
      <input
        value={rol}
        onChange={(e) => setRol(e.target.value)}
        placeholder="Rol en el grupo (opcional, ej. vocalista)"
        className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
      />
      {error && <p className="text-xs" style={{ color: 'var(--destructive)' }}>{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)}
          className="flex-1 py-2 rounded-xl text-sm font-medium border"
          style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
          Cancelar
        </button>
        <button type="submit" disabled={loading || !personaId}
          className="flex-1 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: 'var(--accent)' }}>
          {loading ? 'Agregando...' : 'Agregar'}
        </button>
      </div>
    </form>
  )
}
