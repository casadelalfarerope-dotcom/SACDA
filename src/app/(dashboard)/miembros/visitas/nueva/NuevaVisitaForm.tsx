'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { crearVisita } from '@/app/actions/miembros'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

interface Persona { id: string; nombre_completo: string }

const selectStyle = {
  background: 'var(--surface-secondary)',
  border: '1px solid var(--border)',
  color: 'var(--foreground)',
}

function PersonaSelect({ label, required, value, onChange, personas, placeholder }: {
  label: string
  required?: boolean
  value: string
  onChange: (v: string) => void
  personas: Persona[]
  placeholder: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
        {label} {required && <span style={{ color: 'var(--error)' }}>*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
        style={selectStyle}>
        <option value="">{placeholder}</option>
        {personas.map((p) => (
          <option key={p.id} value={p.id}>{p.nombre_completo}</option>
        ))}
      </select>
    </div>
  )
}

export default function NuevaVisitaForm({ personas }: { personas: Persona[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    persona_id: '',
    fecha_primera_visita: new Date().toISOString().slice(0, 10),
    referido_por: '',
    seguimiento_por: '',
    notas: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      const res = await crearVisita(form)
      if (res.error) { setError(res.error); return }
      router.push('/miembros/visitas')
    })
  }

  return (
    <div className="p-4 md:p-8 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/miembros/visitas"
          className="p-2 rounded-xl hover:opacity-70 transition-opacity"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <ArrowLeft size={18} style={{ color: 'var(--foreground)' }} />
        </Link>
        <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Registrar visita</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 p-5 rounded-2xl border"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>

        <PersonaSelect
          label="Visitante"
          required
          value={form.persona_id}
          onChange={(v) => setForm((p) => ({ ...p, persona_id: v }))}
          personas={personas}
          placeholder="Selecciona al visitante..."
        />
        <p className="text-xs -mt-2" style={{ color: 'var(--muted)' }}>
          Si el visitante no aparece, primero{' '}
          <Link href="/congregantes/nuevo" className="underline" style={{ color: 'var(--accent)' }}>
            créale una ficha
          </Link>.
        </p>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
            Fecha de primera visita <span style={{ color: 'var(--error)' }}>*</span>
          </label>
          <Input
            type="date"
            value={form.fecha_primera_visita}
            onChange={(e) => setForm((p) => ({ ...p, fecha_primera_visita: e.target.value }))}
            required
          />
        </div>

        <PersonaSelect
          label="¿Quién lo trajo? (opcional)"
          value={form.referido_por}
          onChange={(v) => setForm((p) => ({ ...p, referido_por: v }))}
          personas={personas}
          placeholder="Selecciona un miembro..."
        />

        <PersonaSelect
          label="Encargado de seguimiento (opcional)"
          value={form.seguimiento_por}
          onChange={(v) => setForm((p) => ({ ...p, seguimiento_por: v }))}
          personas={personas}
          placeholder="Selecciona un miembro..."
        />

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
            Notas (opcional)
          </label>
          <textarea
            rows={3}
            placeholder="Observaciones del seguimiento..."
            value={form.notas}
            onChange={(e) => setForm((p) => ({ ...p, notas: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl text-sm resize-none outline-none"
            style={{ background: 'var(--surface-secondary)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
          />
        </div>

        {error && (
          <p className="text-sm px-3 py-2 rounded-lg" style={{ background: 'var(--error)20', color: 'var(--error)' }}>
            {error}
          </p>
        )}

        <Button type="submit" loading={isPending} className="w-full">
          Registrar visita
        </Button>
      </form>
    </div>
  )
}
