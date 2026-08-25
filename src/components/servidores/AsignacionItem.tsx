'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Link as LinkIcon, Check } from 'lucide-react'
import { eliminarAsignacion, subirMaterial } from '@/app/actions/servidores'
import Avatar from '@/components/ui/Avatar'

interface Props {
  asignacion: {
    id: string
    persona_id: string
    notas: string | null
    material_url: string | null
    estado_material: string
    personas: { nombre_completo: string; foto_url: string | null }
  }
  programaId: string
  requiereMaterial: boolean
}

export default function AsignacionItem({ asignacion, programaId, requiereMaterial }: Props) {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [showInput, setShowInput] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleEliminar() {
    await eliminarAsignacion(asignacion.id, programaId)
    router.refresh()
  }

  async function handleMaterial() {
    if (!url.trim()) return
    setLoading(true)
    await subirMaterial(asignacion.id, url.trim(), programaId)
    setShowInput(false)
    setUrl('')
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="flex items-center gap-3 p-2 rounded-xl" style={{ background: 'var(--surface-secondary)' }}>
      <Avatar nombre={asignacion.personas.nombre_completo} fotoUrl={asignacion.personas.foto_url} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
          {asignacion.personas.nombre_completo}
        </p>
        {asignacion.material_url && (
          <a href={asignacion.material_url} target="_blank" rel="noopener noreferrer"
            className="text-xs flex items-center gap-1 hover:underline"
            style={{ color: 'var(--accent)' }}>
            <LinkIcon size={11} /> Material subido
          </a>
        )}
      </div>

      <div className="flex items-center gap-1">
        {requiereMaterial && asignacion.estado_material !== 'subido' && (
          <button onClick={() => setShowInput(!showInput)}
            className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
            style={{ color: 'var(--muted)' }} title="Subir enlace de material">
            <LinkIcon size={14} />
          </button>
        )}
        {asignacion.estado_material === 'subido' && (
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#dcfce7', color: '#16a34a' }}>
            <Check size={11} className="inline" /> listo
          </span>
        )}
        <button onClick={handleEliminar}
          className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
          style={{ color: 'var(--muted)' }}>
          <Trash2 size={14} />
        </button>
      </div>

      {showInput && (
        <div className="absolute left-4 right-4 mt-12 z-10 p-3 rounded-xl shadow-lg border flex gap-2"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <input
            value={url} onChange={(e) => setUrl(e.target.value)}
            placeholder="https://drive.google.com/..."
            className="flex-1 px-3 py-2 rounded-xl border text-sm outline-none"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
          />
          <button onClick={handleMaterial} disabled={loading}
            className="px-3 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-50"
            style={{ background: 'var(--accent)' }}>
            Guardar
          </button>
        </div>
      )}
    </div>
  )
}
