import { createClient } from '@/lib/supabase/server'
import GrupoForm from '@/components/ministerios/GrupoForm'
import { crearGrupo } from '@/app/actions/ministerios'
import { Pagina } from '@/components/ui/ios'

export default async function NuevoGrupoPage() {
  const supabase = await createClient()
  const [{ data: grupos }, { data: personas }] = await Promise.all([
    supabase.from('grupos').select('id, nombre').eq('activo', true).order('nombre'),
    supabase.from('personas').select('id, nombre_completo').eq('estado', 'activo').order('nombre_completo'),
  ])

  return (
    <Pagina ancho="estrecho" titulo="Nuevo grupo" volver={{ href: '/ministerios', texto: 'Ministerios' }}>
      <div className="rounded-2xl border p-5 md:p-6"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <GrupoForm grupos={grupos ?? []} personas={personas ?? []} onSubmit={crearGrupo} />
      </div>
    </Pagina>
  )
}
