import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import GrupoForm from '@/components/ministerios/GrupoForm'
import { editarGrupo } from '@/app/actions/ministerios'

export default async function EditarGrupoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: grupo }, { data: grupos }] = await Promise.all([
    supabase.from('grupos').select('*').eq('id', id).single(),
    supabase.from('grupos').select('id, nombre').eq('activo', true).neq('id', id).order('nombre'),
  ])

  if (!grupo) notFound()

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/ministerios/${id}`} className="p-2 rounded-xl" style={{ color: 'var(--muted)' }}>
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Editar grupo</h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>{grupo.nombre}</p>
        </div>
      </div>
      <div className="rounded-2xl border p-5 md:p-6"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <GrupoForm
          grupos={grupos ?? []}
          initialData={grupo}
          onSubmit={(data) => editarGrupo(id, data)}
        />
      </div>
    </div>
  )
}
