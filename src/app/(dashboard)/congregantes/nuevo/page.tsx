import PersonaForm from '@/components/PersonaForm'
import { createClient } from '@/lib/supabase/server'
import { crearPersona } from '@/app/actions/congregantes'
import { Pagina, Tarjeta } from '@/components/ui/ios'

export default async function NuevoCongregantePage() {
  const supabase = await createClient()
  const { data: grupos } = await supabase.from('grupos').select('id, nombre, padre:grupos!grupo_padre_id(nombre)').eq('activo', true).order('nombre')
  const ministerios = (grupos ?? []).map((g) => ({ id: g.id as string, nombre: g.nombre as string, padre: (g.padre as unknown as { nombre: string } | null)?.nombre ?? null }))
    .sort((a, b) => (a.padre ?? a.nombre).localeCompare(b.padre ?? b.nombre) || Number(!!a.padre) - Number(!!b.padre))
  return (
    <Pagina ancho="estrecho" titulo="Nuevo congregante" subtitulo="Registrar una nueva ficha personal"
      volver={{ href: '/congregantes', texto: 'Congregantes' }}>
      <Tarjeta><PersonaForm ministerios={ministerios} onSubmit={crearPersona} /></Tarjeta>
    </Pagina>
  )
}
