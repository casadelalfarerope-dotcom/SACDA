'use client'
import { hoyLima } from '@/lib/utils'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { crearVisita } from '@/app/actions/miembros'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Pagina } from '@/components/ui/ios'
import BuscadorPersona from '@/components/ui/BuscadorPersona'

interface Persona { id: string; nombre_completo: string }

function PersonaSelect({ label, required, value, onChange, personas }: {
  label: string
  required?: boolean
  value: string
  onChange: (v: string) => void
  personas: Persona[]
  placeholder?: string
}) {
  return (
    <BuscadorPersona label={label} required={required} value={value} onChange={(id) => onChange(id)}
      personas={personas.map((p) => ({ id: p.id, nombre: p.nombre_completo }))} />
  )
}

export default function NuevaVisitaForm({ personas }: { personas: Persona[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    persona_id: '',
    fecha_primera_visita: hoyLima(),
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
    <Pagina ancho="estrecho" titulo="Registrar visita" volver={{ href: '/miembros/visitas', texto: 'Visitas' }}>
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
          <label htmlFor="nueva-nuevavis-2" className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
            Fecha de primera visita <span style={{ color: 'var(--error)' }}>*</span>
          </label>
          <Input id="nueva-nuevavis-2"
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
          <label htmlFor="nueva-nuevavis-3" className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
            Notas (opcional)
          </label>
          <textarea id="nueva-nuevavis-3"
            rows={3}
            placeholder="Observaciones del seguimiento..."
            value={form.notas}
            onChange={(e) => setForm((p) => ({ ...p, notas: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl text-sm resize-none outline-none"
            style={{ background: 'var(--surface-secondary)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
          />
        </div>

        {error && (
          <p className="text-sm px-3 py-2 rounded-lg" style={{ background: 'color-mix(in srgb, var(--error) 12%, transparent)', color: 'var(--error)' }}>
            {error}
          </p>
        )}

        <Button type="submit" loading={isPending} className="w-full">
          Registrar visita
        </Button>
      </form>
    </Pagina>
  )
}
