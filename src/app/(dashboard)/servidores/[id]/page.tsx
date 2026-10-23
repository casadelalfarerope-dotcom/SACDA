import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { cargarPrograma } from '@/lib/programas'
import { formatDate } from '@/lib/utils'
import { Pagina, Vacio } from '@/components/ui/ios'
import ParteMinisterio from '@/components/programas/ParteMinisterio'

export default async function ProgramaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: programa } = await supabase.from('programas')
    .select('id, titulo, fecha, hora_inicio, cancelado').eq('id', id).maybeSingle()
  if (!programa) notFound()

  const [ministerios, { data: puedeEditar }] = await Promise.all([
    cargarPrograma(supabase, id),
    supabase.rpc('tiene_permiso', { p_modulo: 'servidores', p_accion: 'editar' }),
  ])

  return (
    <Pagina ancho="estrecho" titulo={programa.titulo} volver={{ href: '/servidores', texto: 'Servidores' }}
      subtitulo={`${formatDate(programa.fecha)}${programa.hora_inicio ? ` · ${programa.hora_inicio.slice(0, 5)}` : ''}${programa.cancelado ? ' · Cancelado en el calendario' : ''}`}>
      {!ministerios.length && (
        <Vacio titulo="Ningún ministerio tiene puestos" texto="Define los puestos de cada ministerio (Predicación, Sonido…) desde Ministerios." />
      )}
      {ministerios.map((m) => (
        <ParteMinisterio key={m.grupo.id} programaId={id} grupo={m.grupo} estado={m.estado}
          puestos={m.puestos} integrantes={m.integrantes} puedeEditar={puedeEditar === true && !programa.cancelado} />
      ))}
    </Pagina>
  )
}
