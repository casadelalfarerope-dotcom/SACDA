'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { crearTarea } from '@/app/actions/tareas'
import { createClient } from '@/lib/supabase/client'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function NuevaTareaPage() {
  const router = useRouter()
  const sp = useSearchParams()
  const tipoInicial = sp.get('tipo') ?? 'diseno'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [personas, setPersonas] = useState<{ id: string; nombre_completo: string }[]>([])

  useEffect(() => {
    createClient().from('personas').select('id, nombre_completo').eq('estado', 'activo').order('nombre_completo')
      .then(({ data }) => setPersonas(data ?? []))
  }, [])

  const selectStyle = {
    background: 'var(--surface)',
    borderColor: 'var(--border)',
    color: 'var(--foreground)',
  }

  async function handle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    const res = await crearTarea({
      tipo: fd.get('tipo') as string,
      titulo: fd.get('titulo') as string,
      descripcion: fd.get('descripcion') as string,
      asignado_id: fd.get('asignado_id') as string,
      fecha_limite: fd.get('fecha_limite') as string,
    })
    if (res.error) { setError(res.error); setLoading(false); return }
    router.push(`/tareas/${res.id}`)
  }

  return (
    <div className="p-4 md:p-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--foreground)' }}>Nueva tarea</h1>
      <form onSubmit={handle} className="space-y-4">
        <div className="p-5 rounded-2xl border space-y-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>
              Tipo <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <select name="tipo" defaultValue={tipoInicial} required
              className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none" style={selectStyle}>
              <option value="diseno">Diseño gráfico</option>
              <option value="solicitud_venta">Solicitud de venta</option>
              <option value="capacitacion">Capacitación</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <Input name="titulo" label="Título" placeholder="Arte para el culto del domingo" required />
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>Descripción</label>
            <textarea name="descripcion" rows={3} placeholder="Detalles de la tarea..."
              className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none resize-none"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>Asignar a</label>
            <select name="asignado_id" className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none" style={selectStyle}>
              <option value="">Sin asignar</option>
              {personas.map((p) => <option key={p.id} value={p.id}>{p.nombre_completo}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>Fecha límite</label>
            <input name="fecha_limite" type="date"
              className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
          </div>
        </div>

        {error && <p className="text-sm px-1" style={{ color: 'var(--error)' }}>{error}</p>}

        <div className="flex gap-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={() => router.back()}>Cancelar</Button>
          <Button type="submit" className="flex-1" loading={loading}>Crear tarea</Button>
        </div>
      </form>
    </div>
  )
}
