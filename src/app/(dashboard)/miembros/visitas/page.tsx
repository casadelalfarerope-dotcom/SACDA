import { createClient } from '@/lib/supabase/server'
import { UserPlus, Plus } from 'lucide-react'
import { formatDateShort } from '@/lib/utils'
import Avatar from '@/components/ui/Avatar'
import { Pagina, Grupo, Fila, BotonEnlace, Vacio } from '@/components/ui/ios'
import CambiarEstadoVisita from '@/components/miembros/CambiarEstadoVisita'
import type { EstadoSeguimiento } from '@/types/database'

export default async function VisitasPage() {
  const supabase = await createClient()

  const { data: visitas } = await supabase
    .from('seguimiento_visitas')
    .select('*, persona:personas!seguimiento_visitas_persona_id_fkey(id, nombre_completo, foto_url)')
    .order('fecha_primera_visita', { ascending: false })

  return (
    <Pagina titulo="Visitas" subtitulo={`${visitas?.length ?? 0} registros`} volver={{ href: '/miembros', texto: 'Seguimiento' }}
      acciones={<BotonEnlace href="/miembros/visitas/nueva" etiqueta="Registrar visita"><Plus size={17} aria-hidden="true" /><span className="hidden sm:inline">Nueva</span></BotonEnlace>}>
      {!visitas?.length ? (
        <Vacio icono={<UserPlus size={44} />} titulo="Sin visitas registradas" texto="Registra la primera visita con el botón +." />
      ) : (
        <Grupo pie="Cambia el estado de cada visita a medida que le das seguimiento.">
          {visitas.map((v, i) => {
            const persona = Array.isArray(v.persona) ? v.persona[0] : v.persona
            return (
              <Fila key={v.id} primero={i === 0}
                inicio={persona ? <Avatar nombre={persona.nombre_completo} fotoUrl={persona.foto_url} size="sm" /> : undefined}
                titulo={persona?.nombre_completo ?? '—'}
                subtitulo={`Primera visita: ${formatDateShort(v.fecha_primera_visita)}${v.volvio ? ' · Volvió' : ''}`}
                detalle={<CambiarEstadoVisita id={v.id} estadoActual={v.estado as EstadoSeguimiento} volvio={v.volvio ?? false} />} />
            )
          })}
        </Grupo>
      )}
    </Pagina>
  )
}
