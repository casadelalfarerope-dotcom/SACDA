'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { crearTutorial } from '@/app/actions/tutoriales'
import { createClient } from '@/lib/supabase/client'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function NuevoTutorialPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [roles, setRoles] = useState<{ id: string; nombre: string }[]>([])

  useEffect(() => {
    createClient().from('roles_servicio').select('id, nombre').eq('activo', true).order('orden')
      .then(({ data }) => setRoles(data ?? []))
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
    const res = await crearTutorial({
      titulo: fd.get('titulo') as string,
      descripcion: fd.get('descripcion') as string,
      rol_servicio_id: fd.get('rol_servicio_id') as string,
      tipo_destino: fd.get('tipo_destino') as string,
      url_contenido: fd.get('url_contenido') as string,
    })
    if (res.error) { setError(res.error); setLoading(false); return }
    router.push(`/capacitacion/${res.id}`)
  }

  return (
    <div className="p-4 md:p-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--foreground)' }}>Nuevo tutorial</h1>
      <form onSubmit={handle} className="space-y-4">
        <div className="p-5 rounded-2xl border space-y-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <Input name="titulo" label="Título" placeholder="Cómo operar el software de presentación" required />
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>Descripción</label>
            <textarea name="descripcion" rows={3} placeholder="Breve descripción del tutorial..."
              className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none resize-none"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>Área de servicio</label>
            <select name="rol_servicio_id" className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none" style={selectStyle}>
              <option value="">Selecciona un área...</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>
              Destino <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <select name="tipo_destino" required className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none" style={selectStyle}>
              <option value="general">General</option>
              <option value="pantalla_principal">Pantalla principal</option>
              <option value="redes_sociales">Redes sociales</option>
            </select>
          </div>
          <Input name="url_contenido" label="Enlace del contenido" placeholder="https://drive.google.com/..." type="url" />
        </div>

        {error && <p className="text-sm px-1" style={{ color: 'var(--error)' }}>{error}</p>}

        <div className="flex gap-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={() => router.back()}>Cancelar</Button>
          <Button type="submit" className="flex-1" loading={loading}>Crear tutorial</Button>
        </div>
      </form>
    </div>
  )
}
