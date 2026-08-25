'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { editarTutorial } from '@/app/actions/tutoriales'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

interface Rol { id: string; nombre: string }

export default function EditarTutorialForm({
  tut, roles,
}: {
  tut: Record<string, unknown>
  roles: Rol[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const id = tut.id as string
  const sel = { background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--foreground)' }

  async function handle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    const res = await editarTutorial(id, {
      titulo: fd.get('titulo') as string,
      descripcion: fd.get('descripcion') as string,
      rol_servicio_id: fd.get('rol_servicio_id') as string,
      tipo_destino: fd.get('tipo_destino') as string,
      url_contenido: fd.get('url_contenido') as string,
    })
    if (res.error) { setError(res.error); setLoading(false); return }
    router.push(`/capacitacion/${id}`)
  }

  return (
    <div className="p-4 md:p-8 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/capacitacion/${id}`}
          className="p-2 rounded-xl hover:opacity-70 transition-opacity"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <ArrowLeft size={18} style={{ color: 'var(--foreground)' }} />
        </Link>
        <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Editar tutorial</h1>
      </div>

      <form onSubmit={handle} className="space-y-4">
        <div className="p-5 rounded-2xl border space-y-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <Input name="titulo" label="Título" defaultValue={tut.titulo as string} required />
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>Descripción</label>
            <textarea name="descripcion" rows={3} defaultValue={tut.descripcion as string ?? ''}
              className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none resize-none"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>Área de servicio</label>
            <select name="rol_servicio_id" defaultValue={tut.rol_servicio_id as string ?? ''}
              className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none" style={sel}>
              <option value="">Sin área específica</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>Destino</label>
            <select name="tipo_destino" defaultValue={tut.tipo_destino as string}
              className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none" style={sel}>
              <option value="general">General</option>
              <option value="pantalla_principal">Pantalla principal</option>
              <option value="redes_sociales">Redes sociales</option>
            </select>
          </div>
          <Input name="url_contenido" label="Enlace del contenido" defaultValue={tut.url_contenido as string ?? ''} type="url" />
        </div>
        {error && <p className="text-sm px-1" style={{ color: 'var(--error)' }}>{error}</p>}
        <div className="flex gap-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={() => router.back()}>Cancelar</Button>
          <Button type="submit" className="flex-1" loading={loading}>Guardar cambios</Button>
        </div>
      </form>
    </div>
  )
}
