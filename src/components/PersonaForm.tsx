'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import type { Persona } from '@/types/database'
import type { PersonaFormData } from '@/app/actions/congregantes'

const MINISTERIOS = [
  'Alabanza', 'Jóvenes', 'Niños', 'Intercesión', 'Multimedia',
  'Diseño Gráfico', 'Limpieza', 'Academia', 'Coordinación', 'Impresiones',
]

interface PersonaFormProps {
  persona?: Persona
  onSubmit: (data: PersonaFormData) => Promise<{ error?: string; fields?: Record<string, string>; success?: boolean }>
  onCancel?: () => void
}

export default function PersonaForm({ persona, onSubmit, onCancel }: PersonaFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const [form, setForm] = useState<PersonaFormData>({
    nombre_completo: persona?.nombre_completo ?? '',
    dni: persona?.dni ?? '',
    fecha_nacimiento: persona?.fecha_nacimiento ?? '',
    telefono: persona?.telefono ?? '',
    email: persona?.email ?? '',
    direccion: persona?.direccion ?? '',
    ministerio: persona?.ministerio ?? '',
    estado: persona?.estado ?? 'activo',
    notas: persona?.notas ?? '',
  })

  function set(field: keyof PersonaFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setFieldErrors((prev) => ({ ...prev, [field]: '' }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await onSubmit(form)

    if (result.error) {
      setError(result.error)
      setFieldErrors(result.fields ?? {})
      setLoading(false)
      return
    }

    router.push('/congregantes')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input
        label="Nombre completo *"
        value={form.nombre_completo}
        onChange={(e) => set('nombre_completo', e.target.value)}
        error={fieldErrors.nombre_completo}
        placeholder="Ej. María García López"
        autoComplete="off"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="DNI"
          value={form.dni ?? ''}
          onChange={(e) => set('dni', e.target.value)}
          error={fieldErrors.dni}
          placeholder="12345678"
          maxLength={8}
          inputMode="numeric"
        />
        <Input
          label="Fecha de nacimiento"
          type="date"
          value={form.fecha_nacimiento ?? ''}
          onChange={(e) => set('fecha_nacimiento', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Teléfono / WhatsApp"
          value={form.telefono ?? ''}
          onChange={(e) => set('telefono', e.target.value)}
          placeholder="+51 999 888 777"
          inputMode="tel"
        />
        <Input
          label="Correo electrónico"
          type="email"
          value={form.email ?? ''}
          onChange={(e) => set('email', e.target.value)}
          error={fieldErrors.email}
          placeholder="nombre@correo.com"
        />
      </div>

      <Input
        label="Dirección"
        value={form.direccion ?? ''}
        onChange={(e) => set('direccion', e.target.value)}
        placeholder="Av. Ejemplo 123, Lima"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Ministerio"
          value={form.ministerio ?? ''}
          onChange={(e) => set('ministerio', e.target.value)}
          placeholder="Sin ministerio asignado"
          options={MINISTERIOS.map((m) => ({ value: m, label: m }))}
        />
        <Select
          label="Estado"
          value={form.estado}
          onChange={(e) => set('estado', e.target.value as PersonaFormData['estado'])}
          options={[
            { value: 'activo',   label: 'Activo' },
            { value: 'inactivo', label: 'Inactivo' },
            { value: 'visita',   label: 'Visita' },
          ]}
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium" style={{ color: 'var(--foreground)' }}>
          Notas internas
        </label>
        <textarea
          value={form.notas ?? ''}
          onChange={(e) => set('notas', e.target.value)}
          rows={3}
          placeholder="Información adicional relevante..."
          className="w-full px-4 py-3 rounded-xl text-sm border outline-none resize-none"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
        />
      </div>

      {error && (
        <p className="text-sm px-4 py-3 rounded-xl"
          style={{ background: '#ff3b3015', color: 'var(--destructive)' }}>
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} className="flex-1 sm:flex-none">
            Cancelar
          </Button>
        )}
        <Button type="submit" loading={loading} className="flex-1 sm:flex-none sm:min-w-32">
          {persona ? 'Guardar cambios' : 'Registrar congregante'}
        </Button>
      </div>
    </form>
  )
}
