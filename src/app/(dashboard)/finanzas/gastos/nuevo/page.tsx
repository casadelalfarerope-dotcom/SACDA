'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { registrarGasto } from '@/app/actions/finanzas'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

const CATEGORIAS = ['local','equipos','actividades','personal','servicios','otros']

export default function NuevoGastoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const sel = { background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--foreground)' }

  async function handle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    const res = await registrarGasto({
      concepto: fd.get('concepto') as string,
      monto: fd.get('monto') as string,
      fecha: fd.get('fecha') as string,
      categoria: fd.get('categoria') as string,
      descripcion: fd.get('descripcion') as string,
    })
    if (res.error) { setError(res.error); setLoading(false); return }
    router.push('/finanzas')
  }

  const hoy = new Date().toISOString().split('T')[0]!

  return (
    <div className="p-4 md:p-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--foreground)' }}>Registrar gasto</h1>
      <form onSubmit={handle} className="space-y-4">
        <div className="p-5 rounded-2xl border space-y-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <Input name="concepto" label="Concepto" placeholder="Pago de luz, compra de cables..." required />
          <Input name="monto" label="Monto (S/.)" type="number" step="0.01" min="0.01" placeholder="0.00" required />
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>
              Categoría <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <select name="categoria" required className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none" style={sel}>
              {CATEGORIAS.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>
              Fecha <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <input name="fecha" type="date" required defaultValue={hoy}
              className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none" style={sel} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>Descripción</label>
            <textarea name="descripcion" rows={2} placeholder="Detalles adicionales..."
              className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none resize-none"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
          </div>
        </div>
        {error && <p className="text-sm px-1" style={{ color: 'var(--error)' }}>{error}</p>}
        <div className="flex gap-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={() => router.back()}>Cancelar</Button>
          <Button type="submit" className="flex-1" loading={loading}>Registrar</Button>
        </div>
      </form>
    </div>
  )
}
