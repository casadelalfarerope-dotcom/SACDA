'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { registrarMantenimiento } from '@/app/actions/inventario'
import Button from '@/components/ui/Button'

export default function RegistrarMantenimientoForm({ bienId }: { bienId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const sel = { background: 'var(--surface-secondary)', borderColor: 'var(--border)', color: 'var(--foreground)' }
  const hoy = new Date().toISOString().split('T')[0]!

  async function handle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    const res = await registrarMantenimiento({
      bien_id: bienId,
      fecha: fd.get('fecha') as string,
      descripcion: fd.get('descripcion') as string,
      costo: fd.get('costo') as string,
      realizado_por: fd.get('realizado_por') as string,
    })
    if (res.error) { setError(res.error); setLoading(false); return }
    ;(e.target as HTMLFormElement).reset()
    router.refresh()
    setLoading(false)
  }

  return (
    <form onSubmit={handle} className="space-y-3">
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Descripción *</label>
        <input name="descripcion" required placeholder="Limpieza, revisión, cambio de cable..."
          className="w-full px-3 py-2 rounded-xl border text-sm outline-none" style={sel} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Fecha *</label>
          <input name="fecha" type="date" required defaultValue={hoy}
            className="w-full px-3 py-2 rounded-xl border text-sm outline-none" style={sel} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Costo (S/.)</label>
          <input name="costo" type="number" step="0.01" min="0" placeholder="0.00"
            className="w-full px-3 py-2 rounded-xl border text-sm outline-none" style={sel} />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Realizado por</label>
        <input name="realizado_por" placeholder="Nombre del técnico"
          className="w-full px-3 py-2 rounded-xl border text-sm outline-none" style={sel} />
      </div>
      {error && <p className="text-xs" style={{ color: 'var(--error)' }}>{error}</p>}
      <Button type="submit" size="sm" loading={loading}>Registrar</Button>
    </form>
  )
}
