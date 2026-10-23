import { CalendarCheck, ClipboardList, GraduationCap, CheckCircle2, Users, Mic2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { contextoEspacio, misMinisterios } from '@/lib/espacio'
import { misTurnos } from '@/lib/programas'
import { estadoTarea } from '@/lib/etiquetas'
import { formatDate, hoyLima } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import { IconoModulo } from '@/components/ui/IconoApp'
import { Pagina, Grupo, Fila, Vacio } from '@/components/ui/ios'
import MaterialTurnoForm from '@/components/espacio/MaterialTurnoForm'
import MarcarVistoBtn from '@/components/servidores/MarcarVistoBtn'

export default async function MisMinisteriosPage() {
  const ctx = await contextoEspacio()
  const supabase = await createClient()
  const hoy = hoyLima()

  const [ministerios, turnos, { data: tareas }] = await Promise.all([
    misMinisterios(ctx.personaId),
    misTurnos(supabase, ctx.personaId),
    supabase.from('tareas').select('id, titulo, tipo, estado, fecha_limite')
      .eq('asignado_id', ctx.personaId).neq('tipo', 'solicitud_venta').order('created_at', { ascending: false }),
  ])

  const proximos = turnos.filter((t) => t.programa.fecha >= hoy)
  const pasados = turnos.filter((t) => t.programa.fecha < hoy).reverse().slice(0, 5)

  // Tutoriales publicados de los puestos de sus ministerios (o generales).
  const { data: puestos } = ministerios.length
    ? await supabase.from('roles_servicio').select('id').in('grupo_id', ministerios.map((m) => m.id))
    : { data: [] }
  const puestoIds = (puestos ?? []).map((p) => p.id as string)
  const [{ data: tutoriales }, { data: progreso }] = await Promise.all([
    supabase.from('tutoriales').select('id, titulo, url_contenido, rol:roles_servicio(nombre)')
      .eq('publicado', true)
      .or(puestoIds.length ? `rol_servicio_id.is.null,rol_servicio_id.in.(${puestoIds.join(',')})` : 'rol_servicio_id.is.null')
      .order('created_at', { ascending: false }),
    supabase.from('tutorial_progreso').select('tutorial_id, visto').eq('persona_id', ctx.personaId),
  ])
  const vistos = new Set((progreso ?? []).filter((p) => p.visto).map((p) => p.tutorial_id))

  const activas = (tareas ?? []).filter((t) => t.estado !== 'aprobado')
  const cerradas = (tareas ?? []).filter((t) => t.estado === 'aprobado').slice(0, 5)

  return (
    <Pagina ancho="estrecho" titulo="Mis ministerios" subtitulo="Dónde sirves, tus turnos y tus tareas">
      <Grupo titulo="Mis ministerios">
        {ministerios.map((m, i) => (
          <Fila key={m.id} primero={i === 0} href={`/mi/ministerios/${m.id}`}
            inicio={<IconoModulo icon={Users} color="#5856d6" tamano={36} />}
            titulo={m.nombre} subtitulo={m.padre ? `Subgrupo de ${m.padre}` : undefined}
            detalle={m.esLider ? <Badge variant="info">Líder</Badge> : undefined} />
        ))}
        {!ministerios.length && <Fila primero titulo={<span style={{ color: 'var(--muted)' }}>Aún no perteneces a ningún ministerio</span>} />}
      </Grupo>

      <Grupo titulo="Mis próximos turnos" pie={proximos.some((t) => t.puesto.requiere_material && t.estado_material !== 'subido')
        ? 'Sube el enlace de tu material (Google Drive u OneDrive) antes del culto.' : undefined}>
        {proximos.map((t, i) => (
          <Fila key={t.id} primero={i === 0}
            inicio={<IconoModulo icon={CalendarCheck} color="#ff2d55" tamano={36} />}
            titulo={`${t.puesto.nombre} · ${t.grupo.nombre}`}
            subtitulo={`${t.programa.titulo} · ${formatDate(t.programa.fecha)}${t.programa.hora_inicio ? ` · ${t.programa.hora_inicio.slice(0, 5)}` : ''}`}
            detalle={!t.publicado ? <Badge variant="muted">Borrador</Badge> : t.puesto.requiere_material ? (t.estado_material === 'subido'
              ? <Badge variant="success">Material listo</Badge>
              : <Badge variant="warning">Falta material</Badge>) : undefined}>
            {t.puesto.requiere_material && (
              <span className="flex flex-wrap items-center gap-2 mt-2">
                {t.material_url && (
                  <a href={t.material_url} target="_blank" rel="noopener noreferrer" className="text-[13px] underline" style={{ color: 'var(--accent)' }}>
                    Ver material subido
                  </a>
                )}
                <MaterialTurnoForm asignacionId={t.id} programaId={t.programa_id} />
              </span>
            )}
          </Fila>
        ))}
        {!proximos.length && <Fila primero titulo={<span style={{ color: 'var(--muted)' }}>No tienes turnos programados</span>} />}
      </Grupo>

      <Grupo titulo="Mis tareas">
        {activas.map((t, i) => {
          const est = estadoTarea(t.estado)
          return (
            <Fila key={t.id} primero={i === 0} href={`/mi/tareas/${t.id}`}
              inicio={<IconoModulo icon={ClipboardList} color="#f5b400" tamano={36} />}
              titulo={t.titulo} subtitulo={t.fecha_limite ? `Vence el ${formatDate(t.fecha_limite)}` : 'Sin fecha límite'}
              detalle={<Badge variant={est.variant}>{est.label}</Badge>} />
          )
        })}
        {!activas.length && <Fila primero titulo={<span style={{ color: 'var(--muted)' }}>No tienes tareas pendientes</span>} />}
      </Grupo>

      {cerradas.length > 0 && (
        <Grupo titulo="Tareas aprobadas">
          {cerradas.map((t, i) => (
            <Fila key={t.id} primero={i === 0} href={`/mi/tareas/${t.id}`}
              titulo={<span style={{ color: 'var(--muted)' }}>{t.titulo}</span>}
              detalle={<Badge variant="success">Aprobada</Badge>} />
          ))}
        </Grupo>
      )}

      {!!tutoriales?.length && (
        <Grupo titulo="Capacitación" pie="Tutoriales de los puestos de tus ministerios.">
          {tutoriales.map((tu, i) => {
            const visto = vistos.has(tu.id)
            const rol = (tu.rol as unknown as { nombre: string } | null)?.nombre ?? 'General'
            return (
              <Fila key={tu.id} primero={i === 0}
                inicio={<IconoModulo icon={visto ? CheckCircle2 : GraduationCap} color={visto ? '#34c759' : '#32ade6'} tamano={36} />}
                titulo={tu.titulo} subtitulo={rol}>
                <span className="flex flex-wrap items-center gap-3 mt-2">
                  {tu.url_contenido && (
                    <a href={tu.url_contenido} target="_blank" rel="noopener noreferrer" className="text-[13px] font-medium underline" style={{ color: 'var(--accent)' }}>
                      Abrir tutorial
                    </a>
                  )}
                  {visto ? <Badge variant="success">Visto</Badge> : <MarcarVistoBtn tutorialId={tu.id} personaId={ctx.personaId} />}
                </span>
              </Fila>
            )
          })}
        </Grupo>
      )}

      {pasados.length > 0 && (
        <Grupo titulo="Turnos anteriores">
          {pasados.map((t, i) => (
            <Fila key={t.id} primero={i === 0} titulo={<span style={{ color: 'var(--muted)' }}>{t.puesto.nombre} · {t.grupo.nombre}</span>}
              subtitulo={`${t.programa.titulo} · ${formatDate(t.programa.fecha)}`} />
          ))}
        </Grupo>
      )}

      {!ministerios.length && !turnos.length && !tareas?.length && (
        <Vacio icono={<Mic2 size={44} />} titulo="Aún no tienes servicio asignado" texto="Cuando un líder te agregue a su ministerio, aparecerá aquí." />
      )}
    </Pagina>
  )
}
