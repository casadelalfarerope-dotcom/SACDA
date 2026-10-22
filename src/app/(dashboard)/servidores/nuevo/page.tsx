'use client'
import { hoyLima } from '@/lib/utils'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { crearPrograma } from '@/app/actions/servidores'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { Pagina } from '@/components/ui/ios'

export default function NuevoProgramaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    const res = await crearPrograma({
      titulo: fd.get('titulo') as string,
      fecha: fd.get('fecha') as string,
      notas: fd.get('notas') as string,
    })
    if (res.error) { setError(res.error); setLoading(false); return }
    router.push(`/servidores/${res.id}`)
  }

  const hoy = hoyLima()

  return (
    <Pagina ancho="estrecho" titulo="Nuevo programa" volver={{ href: '/servidores', texto: 'Servidores' }}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-5 rounded-2xl border space-y-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <Input name="titulo" label="Título" placeholder="Culto Domingo 25 de agosto" required />
          <div>
            <label htmlFor="nuevo-page-1" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>
              Fecha <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <input id="nuevo-page-1"
              name="fecha" type="date" required defaultValue={hoy}
              className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-all"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
            />
          </div>
          <div>
            <label htmlFor="nuevo-page-2" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>Notas</label>
            <textarea id="nuevo-page-2"
              name="notas" rows={3} placeholder="Información adicional..."
              className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none resize-none"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
            />
          </div>
        </div>

        {error && <p className="text-sm px-1" style={{ color: 'var(--error)' }}>{error}</p>}

        <div className="flex gap-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={() => router.back()}>Cancelar</Button>
          <Button type="submit" className="flex-1" loading={loading}>Crear programa</Button>
        </div>
      </form>
    </Pagina>
  )
}
