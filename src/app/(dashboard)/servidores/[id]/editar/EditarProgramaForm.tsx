'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { editarPrograma } from '@/app/actions/servidores'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { Pagina } from '@/components/ui/ios'

interface Programa {
  id: string
  titulo: string
  fecha: string
  notas?: string | null
}

export default function EditarProgramaForm({ programa }: { programa: Programa }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    const res = await editarPrograma(programa.id, {
      titulo: fd.get('titulo') as string,
      fecha: fd.get('fecha') as string,
      notas: fd.get('notas') as string,
    })
    if (res.error) { setError(res.error); setLoading(false); return }
    router.push(`/servidores/${programa.id}`)
  }

  return (
    <Pagina ancho="estrecho" titulo="Editar programa" volver={{ href: `/servidores/${programa.id}`, texto: 'Programa' }}>
      <form onSubmit={handle} className="space-y-4">
        <div className="p-5 rounded-2xl border space-y-4"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <Input name="titulo" label="Título" defaultValue={programa.titulo} required />
          <Input name="fecha" label="Fecha" type="date" defaultValue={programa.fecha} required />
          <div>
            <label htmlFor="editar-editarpr-1" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>Notas</label>
            <textarea id="editar-editarpr-1" name="notas" rows={4} defaultValue={programa.notas ?? ''}
              className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none resize-none"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
          </div>
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
