'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { registrarMovimiento } from '@/app/actions/finanzas'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function AgregarMovimientoForm({ actividadId }: { actividadId: string }) {
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
    const res = await registrarMovimiento({
      actividad_id: actividadId,
      tipo: fd.get('tipo') as string,
      concepto: fd.get('concepto') as string,
      monto: fd.get('monto') as string,
      fecha: fd.get('fecha') as string,
    })
    if (res.error) { setError(res.error); setLoading(false); return }
    ;(e.target as HTMLFormElement).reset()
    router.refresh()
    setLoading(false)
  }

  return (
    <form onSubmit={handle} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Tipo</label>
          <select name="tipo" required className="w-full px-3 py-2 rounded-xl border text-sm outline-none" style={sel}>
            <option value="ingreso">Ingreso</option>
            <option value="egreso">Egreso</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Monto (S/.)</label>
          <input name="monto" type="number" step="0.01" min="0.01" required placeholder="0.00"
            className="w-full px-3 py-2 rounded-xl border text-sm outline-none" style={sel} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Concepto</label>
          <input name="concepto" required placeholder="Descripción"
            className="w-full px-3 py-2 rounded-xl border text-sm outline-none" style={sel} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Fecha</label>
          <input name="fecha" type="date" required defaultValue={hoy}
            className="w-full px-3 py-2 rounded-xl border text-sm outline-none" style={sel} />
        </div>
      </div>
      {error && <p className="text-xs" style={{ color: 'var(--error)' }}>{error}</p>}
      <Button type="submit" size="sm" loading={loading}>Agregar</Button>
    </form>
  )
}
