'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'

interface GrupoFormProps {
  grupos: { id: string; nombre: string }[]
  onSubmit: (data: {
    nombre: string
    descripcion?: string
    tipo: 'servicio' | 'administrativo'
    grupo_padre_id?: string
    encargado_id?: string
    enlace_whatsapp?: string
    activo: boolean
  }) => Promise<{ error?: string; success?: boolean }>
  initialData?: {
    nombre: string
    descripcion?: string | null
    tipo: 'servicio' | 'administrativo'
    grupo_padre_id?: string | null
    enlace_whatsapp?: string | null
    activo: boolean
  }
}

export default function GrupoForm({ grupos, onSubmit, initialData }: GrupoFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    nombre: initialData?.nombre ?? '',
    descripcion: initialData?.descripcion ?? '',
    tipo: initialData?.tipo ?? 'servicio' as 'servicio' | 'administrativo',
    grupo_padre_id: initialData?.grupo_padre_id ?? '',
    enlace_whatsapp: initialData?.enlace_whatsapp ?? '',
    activo: initialData?.activo ?? true,
  })

  function set(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await onSubmit({
      ...form,
      tipo: form.tipo as 'servicio' | 'administrativo',
      grupo_padre_id: form.grupo_padre_id || undefined,
      enlace_whatsapp: form.enlace_whatsapp || undefined,
    })
    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }
    router.push('/ministerios')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input
        label="Nombre del grupo *"
        value={form.nombre}
        onChange={(e) => set('nombre', e.target.value)}
        placeholder="Ej. Ministerio de Jóvenes"
      />
      <div className="space-y-1.5">
        <label className="block text-sm font-medium" style={{ color: 'var(--foreground)' }}>
          Descripción
        </label>
        <textarea
          value={form.descripcion}
          onChange={(e) => set('descripcion', e.target.value)}
          rows={2}
          placeholder="Breve descripción del grupo..."
          className="w-full px-4 py-3 rounded-xl text-sm border outline-none resize-none"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Tipo"
          value={form.tipo}
          onChange={(e) => set('tipo', e.target.value)}
          options={[
            { value: 'servicio', label: 'Servicio' },
            { value: 'administrativo', label: 'Administrativo' },
          ]}
        />
        <Select
          label="Es sub-grupo de..."
          value={form.grupo_padre_id}
          onChange={(e) => set('grupo_padre_id', e.target.value)}
          placeholder="Ninguno (grupo raíz)"
          options={grupos.map((g) => ({ value: g.id, label: g.nombre }))}
        />
      </div>
      <Input
        label="Enlace de WhatsApp (opcional)"
        value={form.enlace_whatsapp}
        onChange={(e) => set('enlace_whatsapp', e.target.value)}
        placeholder="https://chat.whatsapp.com/..."
        type="url"
      />
      {initialData !== undefined && (
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.activo}
            onChange={(e) => set('activo', e.target.checked)}
            className="w-4 h-4 rounded"
          />
          <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Grupo activo</span>
        </label>
      )}
      {error && (
        <p className="text-sm px-4 py-3 rounded-xl"
          style={{ background: '#ff3b3015', color: 'var(--destructive)' }}>
          {error}
        </p>
      )}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={() => router.back()} className="flex-1 sm:flex-none">
          Cancelar
        </Button>
        <Button type="submit" loading={loading} className="flex-1 sm:flex-none sm:min-w-32">
          {initialData ? 'Guardar cambios' : 'Crear grupo'}
        </Button>
      </div>
    </form>
  )
}
