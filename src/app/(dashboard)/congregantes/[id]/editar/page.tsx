import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PersonaForm from '@/components/PersonaForm'
import { editarPersona } from '@/app/actions/congregantes'
import { Pagina, Tarjeta } from '@/components/ui/ios'

export default async function EditarCongregantePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: persona } = await supabase.from('personas').select('*').eq('id', id).single()
  if (!persona) notFound()
  const { data: grupos } = await supabase.from('grupos').select('id, nombre, padre:grupos!grupo_padre_id(nombre)').eq('activo', true).order('nombre')
  const ministerios = (grupos ?? []).map((g) => ({ id: g.id as string, nombre: g.nombre as string, padre: (g.padre as unknown as { nombre: string } | null)?.nombre ?? null }))
    .sort((a, b) => (a.padre ?? a.nombre).localeCompare(b.padre ?? b.nombre) || Number(!!a.padre) - Number(!!b.padre))
  const { data: miembro } = await supabase.from('grupo_miembros').select('grupo_id').eq('persona_id', id).eq('activo', true)

  return (
    <Pagina ancho="estrecho" titulo="Editar" subtitulo={persona.nombre_completo}
      volver={{ href: `/congregantes/${id}`, texto: persona.nombre_completo.split(' ')[0]! }}>
      <Tarjeta><PersonaForm persona={persona} ministerios={ministerios} ministeriosActuales={(miembro ?? []).map((m) => m.grupo_id as string)} onSubmit={editarPersona.bind(null, id)} /></Tarjeta>
    </Pagina>
  )
}
