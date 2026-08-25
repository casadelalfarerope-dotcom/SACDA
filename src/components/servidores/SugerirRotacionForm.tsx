'use client'

import { useState } from 'react'
import { Shuffle, Check, X, ChevronDown, ChevronUp } from 'lucide-react'
import Button from '@/components/ui/Button'

interface Sugerencia {
  rol_servicio_id: string
  rol_nombre: string
  persona_id: string
  persona_nombre: string
  ultima_vez: string | null
}

interface Props {
  programaId: string
  sugerencias: Sugerencia[]
  onConfirmar: (asignaciones: { rol_servicio_id: string; persona_id: string }[]) => Promise<void>
}

export default function SugerirRotacionForm({ programaId, sugerencias, onConfirmar }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [loading, setLoading] = useState(false)
  const [confirmadas, setConfirmadas] = useState<Record<string, boolean>>(
    Object.fromEntries(sugerencias.map((s) => [s.rol_servicio_id, true]))
  )

  const seleccionadas = sugerencias.filter((s) => confirmadas[s.rol_servicio_id])

  async function handleConfirmar() {
    setLoading(true)
    await onConfirmar(seleccionadas.map((s) => ({
      rol_servicio_id: s.rol_servicio_id,
      persona_id: s.persona_id,
    })))
    setLoading(false)
    setAbierto(false)
  }

  if (sugerencias.length === 0) return null

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
      <button
        onClick={() => setAbierto(!abierto)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 transition-opacity hover:opacity-70"
        style={{ background: 'var(--surface)' }}>
        <div className="flex items-center gap-2">
          <Shuffle size={16} style={{ color: 'var(--accent)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
            Rotación sugerida
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--accent)20', color: 'var(--accent)' }}>
            {sugerencias.length} roles
          </span>
        </div>
        {abierto ? <ChevronUp size={16} style={{ color: 'var(--muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--muted)' }} />}
      </button>

      {abierto && (
        <div className="border-t animate-fade" style={{ borderColor: 'var(--border)', background: 'var(--surface-secondary)' }}>
          <div className="p-3 space-y-2">
            <p className="text-xs px-1 pb-1" style={{ color: 'var(--muted)' }}>
              Selecciona las asignaciones a confirmar. Se asigna quien lleva más tiempo sin servir en ese rol.
            </p>
            {sugerencias.map((s) => (
              <label key={s.rol_servicio_id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-opacity hover:opacity-80"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <input
                  type="checkbox"
                  checked={confirmadas[s.rol_servicio_id] ?? true}
                  onChange={(e) =>
                    setConfirmadas((prev) => ({ ...prev, [s.rol_servicio_id]: e.target.checked }))
                  }
                  className="w-4 h-4 rounded flex-shrink-0"
                  style={{ accentColor: 'var(--accent)' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>{s.rol_nombre}</p>
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>
                    {s.persona_nombre}
                  </p>
                </div>
                <span className="text-xs flex-shrink-0" style={{ color: 'var(--muted)' }}>
                  {s.ultima_vez ? `Última vez: ${s.ultima_vez}` : 'Nunca ha servido'}
                </span>
              </label>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 px-3 pb-3">
            <Button variant="secondary" size="sm" onClick={() => setAbierto(false)}>
              <X size={13} /> Cancelar
            </Button>
            <Button size="sm" loading={loading} onClick={handleConfirmar}
              disabled={seleccionadas.length === 0}>
              <Check size={13} /> Confirmar {seleccionadas.length > 0 ? `(${seleccionadas.length})` : ''}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
