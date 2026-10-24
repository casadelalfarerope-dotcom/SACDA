import { createClient } from '@/lib/supabase/server'
import { UserX } from 'lucide-react'
import { formatDateShort } from '@/lib/utils'
import Avatar from '@/components/ui/Avatar'
import { Pagina, Grupo, Fila, BotonEnlace, Vacio } from '@/components/ui/ios'
import CambiarEstadoAusencia from '@/components/miembros/CambiarEstadoAusencia'
import MotivoAusencia from '@/components/miembros/MotivoAusencia'
import ProgramarVisita from '@/components/miembros/ProgramarVisita'
import { hoyLima } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import type { EstadoAusencia } from '@/types/database'

export default async function AusenciasPage() {
  const supabase = await createClient()

  const { data: ausencias } = await supabase
    .from('ausencias')
    .select('*, persona:personas!ausencias_persona_id_fkey(id, nombre_completo, foto_url), encargado:personas!ausencias_seguimiento_por_fkey(nombre_completo)')
    .order('fecha', { ascending: false })

  const { data: posiblesResponsables } = await supabase.from('personas').select('id, nombre_completo').eq('estado', 'activo').order('nombre_completo')
  const responsables = (posiblesResponsables ?? []).map((p) => ({ id: p.id, nombre: p.nombre_completo }))
  const hoy = hoyLima()

  // Faltas seguidas: ausencias desde la última vez que la persona vino a un culto.
  const { data: asistencias } = await supabase.from('asistencia_culto').select('persona_id, fecha')
  const ultimaVez = new Map<string, string>()
  for (const a of asistencias ?? []) if ((ultimaVez.get(a.persona_id) ?? '') < a.fecha) ultimaVez.set(a.persona_id, a.fecha)
  const seguidas = new Map<string, number>()
  for (const a of ausencias ?? []) if (a.evento_id && a.fecha > (ultimaVez.get(a.persona_id) ?? '')) seguidas.set(a.persona_id, (seguidas.get(a.persona_id) ?? 0) + 1)
  // La alerta se muestra solo en la ausencia más reciente de cada persona (vienen ordenadas por fecha, la más nueva primero).
  const ultimaAusencia = new Map<string, string>()
  for (const a of ausencias ?? []) if (!ultimaAusencia.has(a.persona_id)) ultimaAusencia.set(a.persona_id, a.id)

  return (
    <Pagina titulo="Faltaron" subtitulo={`${ausencias?.length ?? 0} registros`} volver={{ href: '/miembros', texto: 'Seguimiento' }}
      acciones={<BotonEnlace href="/miembros/visitas-pastorales" variante="tintado">Visitas pastorales</BotonEnlace>}>
      {!ausencias?.length ? (
        <Vacio icono={<UserX size={44} />} titulo="Nadie faltó" texto="Cuando se pase lista en un culto, quienes no vinieron aparecerán aquí para anotar el motivo." />
      ) : (
        <Grupo pie="Actualiza el estado cuando el encargado haya contactado al hermano.">
          {ausencias.map((a, i) => {
            const persona = Array.isArray(a.persona) ? a.persona[0] : a.persona
            const encargado = Array.isArray(a.encargado) ? a.encargado[0] : a.encargado
            return (
              <Fila key={a.id} primero={i === 0}
                inicio={persona ? <Avatar nombre={persona.nombre_completo} fotoUrl={persona.foto_url} size="sm" /> : undefined}
                titulo={persona?.nombre_completo ?? '—'}
                subtitulo={[formatDateShort(a.fecha), encargado && `Encargado: ${encargado.nombre_completo}`].filter(Boolean).join(' · ')}
                detalle={<CambiarEstadoAusencia id={a.id} estadoActual={a.estado as EstadoAusencia} />}>
                {(seguidas.get(a.persona_id) ?? 0) >= 2 && a.estado === 'pendiente' && ultimaAusencia.get(a.persona_id) === a.id && (
                  <span className="block mt-1"><Badge variant="error">Faltó {seguidas.get(a.persona_id)} cultos seguidos</Badge></span>
                )}
                <MotivoAusencia id={a.id} motivo={a.motivo} />
                {a.estado !== 'resuelto' && ultimaAusencia.get(a.persona_id) === a.id && (
                  <ProgramarVisita personaId={a.persona_id} ausenciaId={a.id} personas={responsables} hoy={hoy}
                    motivoSugerido={(seguidas.get(a.persona_id) ?? 0) >= 2 ? `Faltó ${seguidas.get(a.persona_id)} cultos seguidos` : a.motivo ?? undefined} />
                )}
              </Fila>
            )
          })}
        </Grupo>
      )}
    </Pagina>
  )
}
