'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { crearActividad } from '@/app/actions/finanzas'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function NuevaActividadPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const hoy = new Date().toISOString().split('T')[0]!

  async function handle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    const res = await crearActividad({
      nombre: fd.get('nombre') as string,
      fecha: fd.get('fecha') as string,
      descripcion: fd.get('descripcion') as string,
    })
    if (res.error) { setError(res.error); setLoading(false); return }
    router.push(`/finanzas/actividades/${res.id}`)
  }

  return (
    <div className="p-4 md:p-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--foreground)' }}>Nueva actividad</h1>
      <form onSubmit={handle} className="space-y-4">
        <div className="p-5 rounded-2xl border space-y-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <Input name="nombre" label="Nombre" placeholder="Pollada, Bazar, Bingo..." required />
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>
              Fecha <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <input name="fecha" type="date" required defaultValue={hoy}
              className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>Descripción</label>
            <textarea name="descripcion" rows={2}
              className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none resize-none"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
          </div>
        </div>
        {error && <p className="text-sm px-1" style={{ color: 'var(--error)' }}>{error}</p>}
        <div className="flex gap-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={() => router.back()}>Cancelar</Button>
          <Button type="submit" className="flex-1" loading={loading}>Crear</Button>
        </div>
      </form>
    </div>
  )
}
