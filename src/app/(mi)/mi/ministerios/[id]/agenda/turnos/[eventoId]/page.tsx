import { notFound } from 'next/navigation'
import { Users } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/service'
import { contextoEspacio, misMinisterios } from '@/lib/espacio'
import { asegurarProgramas } from '@/lib/programas'
import { integrantesDe } from '@/lib/agenda'
import { formatDate, hoyLima } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import { IconoModulo } from '@/components/ui/IconoApp'
import { Pagina, Grupo, Fila } from '@/components/ui/ios'
import PuestosMinisterio from '@/components/programas/PuestosMinisterio'
import CompletarProximosBtn from '@/components/programas/CompletarProximosBtn'

// Turnos de un evento del ministerio (p. ej. Limpieza del sábado): sus puestos
// propios y la programación de cada fecha, con rotación como en los cultos.
export default async function TurnosEventoPage({ params }: { params: Promise<{ id: string; eventoId: string }> }) {
  const { id, eventoId } = await params
  const ctx = await contextoEspacio()
  const mio = (await misMinisterios(ctx.personaId)).find((m) => m.id === id)
  if (!mio?.gestiona) notFound()

  const admin = createServiceClient()
  const { data: evento } = await admin.from('eventos').select('id, titulo, grupo_id').eq('id', eventoId).eq('grupo_id', id).maybeSingle()
  if (!evento) notFound()
  await asegurarProgramas(admin)

  const hoy = hoyLima()
  const [{ data: puestos }, integrantes, { data: programas }] = await Promise.all([
    admin.from('roles_servicio').select('id, nombre, cantidad, modo, requiere_material, puesto_candidatos(persona_id, orden)')
      .eq('evento_id', eventoId).eq('activo', true).order('orden'),
    integrantesDe(admin, id),
    admin.from('programas').select('id, fecha, hora_inicio, programa_ministerios(estado), programa_asignaciones(id)')
      .eq('evento_id', eventoId).eq('cancelado', false).gte('fecha', hoy).order('fecha').limit(12),
  ])
  const necesarios = (puestos ?? []).reduce((n, p) => n + (p.cantidad as number), 0)

  return (
    <Pagina ancho="estrecho" titulo={`Turnos · ${evento.titulo}`} subtitulo="Quién tiene que ir en cada fecha. Igual que en los cultos: fijo o rota."
      volver={{ href: `/mi/ministerios/${id}/agenda`, texto: 'Agenda' }}>
      {!!puestos?.length && (
        <section className="space-y-2">
          <div className="px-1"><CompletarProximosBtn grupoId={id} eventoId={eventoId} /></div>
          <Grupo titulo="Próximas fechas" pie="Abre una fecha para asignar o cambiar personas y publicarla. Al publicar, a cada uno le llega un aviso.">
            {(programas ?? []).map((p, i) => {
              const n = ((p.programa_asignaciones ?? []) as unknown[]).length
              const publicado = ((p.programa_ministerios ?? []) as { estado: string }[]).some((m) => m.estado === 'publicado')
              return (
                <Fila key={p.id} primero={i === 0} href={`/mi/ministerios/${id}/culto/${p.id}`}
                  inicio={<IconoModulo icon={Users} color={publicado ? '#34c759' : '#ff2d55'} tamano={36} />}
                  titulo={formatDate(p.fecha)} subtitulo={p.hora_inicio ? p.hora_inicio.slice(0, 5) : undefined}
                  detalle={publicado ? <Badge variant="success">Publicado</Badge> : <Badge variant={n ? 'warning' : 'muted'}>{n}/{necesarios}</Badge>} />
              )
            })}
            {!programas?.length && <Fila primero titulo={<span style={{ color: 'var(--muted)' }}>No hay fechas próximas de este evento</span>} />}
          </Grupo>
        </section>
      )}

      {!mio.esLider && !puestos?.length && (
        <p className="px-1 text-[14px]" style={{ color: 'var(--muted)' }}>Este evento aún no tiene puestos. Los define un líder del ministerio.</p>
      )}
      {mio.esLider && <section className="space-y-1.5" aria-labelledby="puestos-evento">
        <h2 id="puestos-evento" className="px-4 text-[13px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Puestos de este evento</h2>
        {!puestos?.length && (
          <p className="px-4 text-[14px]" style={{ color: 'var(--muted)' }}>
            Agrega un puesto, por ejemplo “Limpieza del templo: 3 personas, rota”. Si en este evento participan todos, no necesitas puestos.
          </p>
        )}
        <PuestosMinisterio grupoId={id} eventoId={eventoId}
          integrantes={integrantes.map((p) => ({ id: p.id, nombre: p.nombre_completo }))}
          puestos={(puestos ?? []).map((p) => ({
            id: p.id, nombre: p.nombre, cantidad: p.cantidad, modo: p.modo, requiere_material: p.requiere_material,
            candidatos: ((p.puesto_candidatos ?? []) as { persona_id: string; orden: number }[]).sort((a, b) => a.orden - b.orden).map((c) => c.persona_id),
          }))} />
      </section>}
    </Pagina>
  )
}
