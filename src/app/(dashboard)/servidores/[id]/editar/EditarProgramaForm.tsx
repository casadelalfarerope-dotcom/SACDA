'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { editarPrograma } from '@/app/actions/servidores'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

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
    <div className="p-4 md:p-8 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/servidores/${programa.id}`}
          className="p-2 rounded-xl hover:opacity-70 transition-opacity"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <ArrowLeft size={18} style={{ color: 'var(--foreground)' }} />
        </Link>
        <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Editar programa</h1>
      </div>

      <form onSubmit={handle} className="space-y-4">
        <div className="p-5 rounded-2xl border space-y-4"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <Input name="titulo" label="Título" defaultValue={programa.titulo} required />
          <Input name="fecha" label="Fecha" type="date" defaultValue={programa.fecha} required />
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>Notas</label>
            <textarea name="notas" rows={4} defaultValue={programa.notas ?? ''}
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
    </div>
  )
}
