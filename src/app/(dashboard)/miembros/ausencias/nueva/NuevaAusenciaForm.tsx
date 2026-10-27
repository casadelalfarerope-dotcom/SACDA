'use client'
import { hoyLima } from '@/lib/utils'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { registrarAusencia } from '@/app/actions/miembros'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Pagina } from '@/components/ui/ios'
import BuscadorPersona from '@/components/ui/BuscadorPersona'

interface Persona { id: string; nombre_completo: string }

export default function NuevaAusenciaForm({ personas }: { personas: Persona[] }) {
  const router = useRouter()
  const opciones = personas.map((p) => ({ id: p.id, nombre: p.nombre_completo }))
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    persona_id: '',
    fecha: hoyLima(),
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
    <Pagina ancho="estrecho" titulo="Registrar ausencia" volver={{ href: '/miembros/ausencias', texto: 'Ausencias' }}>
      <form onSubmit={handleSubmit} className="space-y-4 p-5 rounded-2xl border"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>

        <div>
          <BuscadorPersona label="Miembro ausente" required autoFocus
            personas={opciones} value={form.persona_id}
            onChange={(id) => setForm((p) => ({ ...p, persona_id: id }))} />
        </div>

        <div>
          <label htmlFor="nueva-nuevaaus-2" className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
            Fecha de ausencia <span style={{ color: 'var(--error)' }}>*</span>
          </label>
          <Input id="nueva-nuevaaus-2"
            type="date"
            value={form.fecha}
            onChange={(e) => setForm((p) => ({ ...p, fecha: e.target.value }))}
            required
          />
        </div>

        <div>
          <label htmlFor="nueva-nuevaaus-3" className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
            Motivo (opcional)
          </label>
          <Input id="nueva-nuevaaus-3"
            placeholder="Ej. viaje, enfermedad..."
            value={form.motivo}
            onChange={(e) => setForm((p) => ({ ...p, motivo: e.target.value }))}
          />
        </div>

        <div>
          <BuscadorPersona label="Encargado de seguimiento (opcional)" vacio="Sin asignar"
            personas={opciones} value={form.seguimiento_por}
            onChange={(id) => setForm((p) => ({ ...p, seguimiento_por: id }))} />
        </div>

        {error && (
          <p className="text-sm px-3 py-2 rounded-lg" style={{ background: 'color-mix(in srgb, var(--error) 12%, transparent)', color: 'var(--error)' }}>
            {error}
          </p>
        )}

        <Button type="submit" loading={isPending} className="w-full">
          Registrar ausencia
        </Button>
      </form>
    </Pagina>
  )
}
