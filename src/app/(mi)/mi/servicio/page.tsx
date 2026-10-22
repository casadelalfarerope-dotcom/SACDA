import { CalendarCheck, ClipboardList, GraduationCap, CheckCircle2, Mic2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { contextoEspacio } from '@/lib/espacio'
import { estadoTarea } from '@/lib/etiquetas'
import { formatDate, hoyLima } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import { IconoModulo } from '@/components/ui/IconoApp'
import { Pagina, Grupo, Fila, Vacio } from '@/components/ui/ios'
import MaterialTurnoForm from '@/components/espacio/MaterialTurnoForm'
import MarcarVistoBtn from '@/components/servidores/MarcarVistoBtn'

export default async function MiServicioPage() {
  const ctx = await contextoEspacio()
  const supabase = await createClient()
  const hoy = hoyLima()

  const [{ data: turnos }, { data: tareas }] = await Promise.all([
    supabase.from('programa_asignaciones')
      .select('id, programa_id, material_url, estado_material, rol_servicio_id, rol:roles_servicio(nombre, requiere_material), programa:programas!inner(titulo, fecha, estado)')
      .eq('persona_id', ctx.personaId).eq('programa.estado', 'publicado'),
    supabase.from('tareas').select('id, titulo, tipo, estado, fecha_limite')
      .eq('asignado_id', ctx.personaId).neq('tipo', 'solicitud_venta').order('created_at', { ascending: false }),
  ])

  const lista = (turnos ?? []).map((t) => ({
    ...t,
    p: t.programa as unknown as { titulo: string; fecha: string },
    r: t.rol as unknown as { nombre: string; requiere_material: boolean } | null,
  }))
  const proximos = lista.filter((t) => t.p.fecha >= hoy).sort((a, b) => a.p.fecha.localeCompare(b.p.fecha))
  const pasados = lista.filter((t) => t.p.fecha < hoy).sort((a, b) => b.p.fecha.localeCompare(a.p.fecha)).slice(0, 5)

  // Tutoriales publicados de los roles en que sirve (o generales).
  const rolesIds = [...new Set(lista.map((t) => t.rol_servicio_id as string))]
  const [{ data: tutoriales }, { data: progreso }] = await Promise.all([
    supabase.from('tutoriales').select('id, titulo, url_contenido, rol_servicio_id, rol:roles_servicio(nombre)')
      .eq('publicado', true)
      .or(rolesIds.length ? `rol_servicio_id.is.null,rol_servicio_id.in.(${rolesIds.join(',')})` : 'rol_servicio_id.is.null')
      .order('created_at', { ascending: false }),
    supabase.from('tutorial_progreso').select('tutorial_id, visto').eq('persona_id', ctx.personaId),
  ])
  const vistos = new Set((progreso ?? []).filter((p) => p.visto).map((p) => p.tutorial_id))

  const activas = (tareas ?? []).filter((t) => !['aprobado'].includes(t.estado))
  const cerradas = (tareas ?? []).filter((t) => t.estado === 'aprobado').slice(0, 5)

  return (
    <Pagina ancho="estrecho" titulo="Mi servicio" subtitulo="Tus turnos, tareas y capacitación">
      <Grupo titulo="Próximos turnos" pie={proximos.some((t) => t.r?.requiere_material && t.estado_material !== 'subido')
        ? 'Sube el enlace de tu material (Google Drive u OneDrive) antes del culto.' : undefined}>
        {proximos.map((t, i) => (
          <Fila key={t.id} primero={i === 0}
            inicio={<IconoModulo icon={CalendarCheck} color="#ff2d55" tamano={36} />}
            titulo={t.r?.nombre ?? 'Servicio'} subtitulo={`${t.p.titulo} · ${formatDate(t.p.fecha)}`}
            detalle={t.r?.requiere_material ? (t.estado_material === 'subido'
              ? <Badge variant="success">Material listo</Badge>
              : <Badge variant="warning">Falta material</Badge>) : undefined}>
            {t.r?.requiere_material && (
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

      <Grupo titulo="Capacitación" pie="Tutoriales de las áreas en las que sirves.">
        {(tutoriales ?? []).map((tu, i) => {
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
        {!tutoriales?.length && <Fila primero titulo={<span style={{ color: 'var(--muted)' }}>Aún no hay tutoriales para tus áreas</span>} />}
      </Grupo>

      {pasados.length > 0 && (
        <Grupo titulo="Turnos anteriores">
          {pasados.map((t, i) => (
            <Fila key={t.id} primero={i === 0} titulo={<span style={{ color: 'var(--muted)' }}>{t.r?.nombre ?? 'Servicio'}</span>}
              subtitulo={`${t.p.titulo} · ${formatDate(t.p.fecha)}`} />
          ))}
        </Grupo>
      )}

      {!lista.length && !tareas?.length && (
        <Vacio icono={<Mic2 size={44} />} titulo="Aún no tienes servicio asignado" texto="Cuando un líder te programe en un culto o te asigne una tarea, aparecerá aquí." />
      )}
    </Pagina>
  )
}
