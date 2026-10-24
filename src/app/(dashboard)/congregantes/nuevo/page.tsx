import PersonaForm from '@/components/PersonaForm'
import { createClient } from '@/lib/supabase/server'
import { crearPersona } from '@/app/actions/congregantes'
import { Pagina, Tarjeta } from '@/components/ui/ios'

export default async function NuevoCongregantePage() {
  const supabase = await createClient()
  const { data: grupos } = await supabase.from('grupos').select('id, nombre, grupo_padre_id').eq('activo', true).order('nombre')
  const nombreDe = new Map((grupos ?? []).map((g) => [g.id as string, g.nombre as string]))
  const ministerios = (grupos ?? []).map((g) => ({ id: g.id as string, nombre: g.nombre as string, padre: g.grupo_padre_id ? nombreDe.get(g.grupo_padre_id) ?? null : null }))
    .sort((a, b) => (a.padre ?? a.nombre).localeCompare(b.padre ?? b.nombre) || Number(!!a.padre) - Number(!!b.padre))
  return (
    <Pagina ancho="estrecho" titulo="Nuevo congregante" subtitulo="Registrar una nueva ficha personal"
      volver={{ href: '/congregantes', texto: 'Congregantes' }}>
      <Tarjeta><PersonaForm ministerios={ministerios} onSubmit={crearPersona} /></Tarjeta>
    </Pagina>
  )
}
