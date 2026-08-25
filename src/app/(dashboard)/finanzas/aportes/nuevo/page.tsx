'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { registrarAporte } from '@/app/actions/finanzas'
import { createClient } from '@/lib/supabase/client'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function NuevoAportePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [personas, setPersonas] = useState<{ id: string; nombre_completo: string }[]>([])

  useEffect(() => {
    createClient().from('personas').select('id, nombre_completo').eq('estado', 'activo').order('nombre_completo')
      .then(({ data }) => setPersonas(data ?? []))
  }, [])

  const sel = { background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--foreground)' }

  async function handle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    const res = await registrarAporte({
      persona_id: fd.get('persona_id') as string,
      tipo: fd.get('tipo') as string,
      monto: fd.get('monto') as string,
      fecha: fd.get('fecha') as string,
      concepto: fd.get('concepto') as string,
    })
    if (res.error) { setError(res.error); setLoading(false); return }
    router.push('/finanzas/aportes')
  }

  const hoy = new Date().toISOString().split('T')[0]!

  return (
    <div className="p-4 md:p-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--foreground)' }}>Registrar aporte</h1>
      <form onSubmit={handle} className="space-y-4">
        <div className="p-5 rounded-2xl border space-y-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>
              Persona <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <select name="persona_id" required className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none" style={sel}>
              <option value="">Selecciona...</option>
              {personas.map((p) => <option key={p.id} value={p.id}>{p.nombre_completo}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>
              Tipo <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <select name="tipo" required className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none" style={sel}>
              <option value="ofrenda">Ofrenda</option>
              <option value="diezmo">Diezmo</option>
              <option value="pacto">Pacto</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <Input name="monto" label="Monto (S/.)" type="number" step="0.01" min="0.01" placeholder="0.00" required />
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>
              Fecha <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <input name="fecha" type="date" required defaultValue={hoy}
              className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none" style={sel} />
          </div>
          <Input name="concepto" label="Concepto (opcional)" placeholder="Descripción adicional" />
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
