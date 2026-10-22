import { createClient } from '@/lib/supabase/server'
import GrupoForm from '@/components/ministerios/GrupoForm'
import { crearGrupo } from '@/app/actions/ministerios'
import { Pagina } from '@/components/ui/ios'

export default async function NuevoGrupoPage() {
  const supabase = await createClient()
  const { data: grupos } = await supabase
    .from('grupos')
    .select('id, nombre')
    .eq('activo', true)
    .order('nombre')

  return (
    <Pagina ancho="estrecho" titulo="Nuevo grupo" volver={{ href: '/ministerios', texto: 'Ministerios' }}>
      <div className="rounded-2xl border p-5 md:p-6"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <GrupoForm grupos={grupos ?? []} onSubmit={crearGrupo} />
      </div>
    </Pagina>
  )
}
