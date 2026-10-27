'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { editarTutorial } from '@/app/actions/tutoriales'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { Pagina } from '@/components/ui/ios'
import Select from '@/components/ui/Select'

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
    <Pagina ancho="estrecho" titulo="Editar tutorial" volver={{ href: `/capacitacion/${id}`, texto: 'Tutorial' }}>
      <form onSubmit={handle} className="space-y-4">
        <div className="p-5 rounded-2xl border space-y-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <Input name="titulo" label="Título" defaultValue={tut.titulo as string} required />
          <div>
            <label htmlFor="editar-editartu-1" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>Descripción</label>
            <textarea id="editar-editartu-1" name="descripcion" rows={3} defaultValue={tut.descripcion as string ?? ''}
              className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none resize-none"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
          </div>
          <div>
            <Select label="Área de servicio" name="rol_servicio_id" defaultValue={tut.rol_servicio_id as string ?? ''} placeholder="Sin área específica"
              options={roles.map((r) => ({ value: r.id, label: r.nombre }))} />
          </div>
          <div>
            <Select label="Destino" name="tipo_destino" defaultValue={tut.tipo_destino as string}
              options={[{ value: 'general', label: 'General' }, { value: 'pantalla_principal', label: 'Pantalla principal' }, { value: 'redes_sociales', label: 'Redes sociales' }]} />
          </div>
          <Input name="url_contenido" label="Enlace del contenido" defaultValue={tut.url_contenido as string ?? ''} type="url" />
        </div>
        {error && <p className="text-sm px-1" style={{ color: 'var(--error)' }}>{error}</p>}
        <div className="flex gap-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={() => router.back()}>Cancelar</Button>
          <Button type="submit" className="flex-1" loading={loading}>Guardar cambios</Button>
        </div>
      </form>
    </Pagina>
  )
}
