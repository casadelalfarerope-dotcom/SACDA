'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { registrarAusencia } from '@/app/actions/miembros'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

interface Persona { id: string; nombre_completo: string }

const selectStyle = {
  background: 'var(--surface-secondary)',
  border: '1px solid var(--border)',
  color: 'var(--foreground)',
}

export default function NuevaAusenciaForm({ personas }: { personas: Persona[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    persona_id: '',
    fecha: new Date().toISOString().slice(0, 10),
    motivo: '',
    seguimiento_por: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      const res = await registrarAusencia(form)
      if (res.error) { setError(res.error); return }
      router.push('/miembros/ausencias')
    })
  }

  return (
    <div className="p-4 md:p-8 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/miembros/ausencias"
          className="p-2 rounded-xl hover:opacity-70 transition-opacity"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <ArrowLeft size={18} style={{ color: 'var(--foreground)' }} />
        </Link>
        <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Registrar ausencia</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 p-5 rounded-2xl border"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
            Miembro ausente <span style={{ color: 'var(--error)' }}>*</span>
          </label>
          <select
            value={form.persona_id}
            onChange={(e) => setForm((p) => ({ ...p, persona_id: e.target.value }))}
            required
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={selectStyle}>
            <option value="">Selecciona un miembro...</option>
            {personas.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre_completo}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
            Fecha de ausencia <span style={{ color: 'var(--error)' }}>*</span>
          </label>
          <Input
            type="date"
            value={form.fecha}
            onChange={(e) => setForm((p) => ({ ...p, fecha: e.target.value }))}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
            Motivo (opcional)
          </label>
          <Input
            placeholder="Ej. viaje, enfermedad..."
            value={form.motivo}
            onChange={(e) => setForm((p) => ({ ...p, motivo: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
            Encargado de seguimiento (opcional)
          </label>
          <select
            value={form.seguimiento_por}
            onChange={(e) => setForm((p) => ({ ...p, seguimiento_por: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={selectStyle}>
            <option value="">Sin asignar</option>
            {personas.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre_completo}</option>
            ))}
          </select>
        </div>

        {error && (
          <p className="text-sm px-3 py-2 rounded-lg" style={{ background: 'var(--error)20', color: 'var(--error)' }}>
            {error}
          </p>
        )}

        <Button type="submit" loading={isPending} className="w-full">
          Registrar ausencia
        </Button>
      </form>
    </div>
  )
}
