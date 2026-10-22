import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import GrupoForm from '@/components/ministerios/GrupoForm'
import { editarGrupo } from '@/app/actions/ministerios'
import { Pagina } from '@/components/ui/ios'

export default async function EditarGrupoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: grupo }, { data: grupos }] = await Promise.all([
    supabase.from('grupos').select('*').eq('id', id).single(),
    supabase.from('grupos').select('id, nombre').eq('activo', true).neq('id', id).order('nombre'),
  ])

  if (!grupo) notFound()

  return (
    <Pagina ancho="estrecho" titulo="Editar grupo" subtitulo={grupo.nombre} volver={{ href: `/ministerios/${id}`, texto: 'Grupo' }}>
      <div className="rounded-2xl border p-5 md:p-6"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <GrupoForm
          grupos={grupos ?? []}
          initialData={grupo}
          onSubmit={editarGrupo.bind(null, id)}
        />
      </div>
    </Pagina>
  )
}
