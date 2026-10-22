import { createClient } from '@/lib/supabase/server'
import { UserX, Plus } from 'lucide-react'
import { formatDateShort } from '@/lib/utils'
import Avatar from '@/components/ui/Avatar'
import { Pagina, Grupo, Fila, BotonEnlace, Vacio } from '@/components/ui/ios'
import CambiarEstadoAusencia from '@/components/miembros/CambiarEstadoAusencia'
import type { EstadoAusencia } from '@/types/database'

export default async function AusenciasPage() {
  const supabase = await createClient()

  const { data: ausencias } = await supabase
    .from('ausencias')
    .select('*, persona:personas!ausencias_persona_id_fkey(id, nombre_completo, foto_url), encargado:personas!ausencias_seguimiento_por_fkey(nombre_completo)')
    .order('fecha', { ascending: false })

  return (
    <Pagina titulo="Ausencias" subtitulo={`${ausencias?.length ?? 0} registros`} volver={{ href: '/miembros', texto: 'Miembros' }}
      acciones={<BotonEnlace href="/miembros/ausencias/nueva" etiqueta="Registrar ausencia"><Plus size={17} aria-hidden="true" /><span className="hidden sm:inline">Nueva</span></BotonEnlace>}>
      {!ausencias?.length ? (
        <Vacio icono={<UserX size={44} />} titulo="Sin ausencias registradas" texto="Registra una ausencia con el botón +." />
      ) : (
        <Grupo pie="Actualiza el estado cuando el encargado haya contactado al hermano.">
          {ausencias.map((a, i) => {
            const persona = Array.isArray(a.persona) ? a.persona[0] : a.persona
            const encargado = Array.isArray(a.encargado) ? a.encargado[0] : a.encargado
            return (
              <Fila key={a.id} primero={i === 0}
                inicio={persona ? <Avatar nombre={persona.nombre_completo} fotoUrl={persona.foto_url} size="sm" /> : undefined}
                titulo={persona?.nombre_completo ?? '—'}
                subtitulo={[formatDateShort(a.fecha), a.motivo, encargado && `Encargado: ${encargado.nombre_completo}`].filter(Boolean).join(' · ')}
                detalle={<CambiarEstadoAusencia id={a.id} estadoActual={a.estado as EstadoAusencia} />} />
            )
          })}
        </Grupo>
      )}
    </Pagina>
  )
}
