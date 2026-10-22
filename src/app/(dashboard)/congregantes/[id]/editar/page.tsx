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

  return (
    <Pagina ancho="estrecho" titulo="Editar" subtitulo={persona.nombre_completo}
      volver={{ href: `/congregantes/${id}`, texto: persona.nombre_completo.split(' ')[0]! }}>
      <Tarjeta><PersonaForm persona={persona} onSubmit={editarPersona.bind(null, id)} /></Tarjeta>
    </Pagina>
  )
}
