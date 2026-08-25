'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { crearVisita } from '@/app/actions/miembros'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function NuevaVisitaPage() {
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

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
            ID de persona <span style={{ color: 'var(--error)' }}>*</span>
          </label>
          <Input
            placeholder="UUID de la persona visitante"
            value={form.persona_id}
            onChange={(e) => setForm((p) => ({ ...p, persona_id: e.target.value }))}
            required
          />
          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
            Primero crea la ficha del visitante en Congregantes, luego copia su ID.
          </p>
        </div>

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

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
            Referido por (ID, opcional)
          </label>
          <Input
            placeholder="UUID del miembro que lo trajo"
            value={form.referido_por}
            onChange={(e) => setForm((p) => ({ ...p, referido_por: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
            Encargado de seguimiento (ID, opcional)
          </label>
          <Input
            placeholder="UUID del encargado"
            value={form.seguimiento_por}
            onChange={(e) => setForm((p) => ({ ...p, seguimiento_por: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
            Notas (opcional)
          </label>
          <textarea
            rows={3}
            placeholder="Observaciones del seguimiento..."
            value={form.notas}
            onChange={(e) => setForm((p) => ({ ...p, notas: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl text-sm resize-none"
            style={{
              background: 'var(--surface-secondary)',
              border: '1px solid var(--border)',
              color: 'var(--foreground)',
              outline: 'none',
            }}
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
