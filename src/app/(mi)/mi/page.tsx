import { CalendarCheck, ClipboardList, ShoppingBag, School, Wallet } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { contextoEspacio } from '@/lib/espacio'
import { estadoTarea } from '@/lib/etiquetas'
import { formatDate, hoyLima } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import { IconoModulo } from '@/components/ui/IconoApp'
import { Pagina, Grupo, Fila } from '@/components/ui/ios'

function saludo() {
  const hora = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Lima', hour: 'numeric', hour12: false }).format(new Date()))
  return hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'
}

export default async function MiInicioPage() {
  const ctx = await contextoEspacio()
  const supabase = await createClient()
  const hoy = hoyLima()

  const [{ data: turnos }, { data: tareas }, { data: solicitudes }] = await Promise.all([
    supabase.from('programa_asignaciones')
      .select('id, rol:roles_servicio(nombre), programa:programas!inner(titulo, fecha, estado)')
      .eq('persona_id', ctx.personaId).eq('programa.estado', 'publicado').gte('programa.fecha', hoy),
    supabase.from('tareas').select('id, titulo, estado, fecha_limite')
      .eq('asignado_id', ctx.personaId).neq('tipo', 'solicitud_venta')
      .in('estado', ['pendiente', 'en_progreso', 'rechazado']).order('fecha_limite', { nullsFirst: false }).limit(5),
    supabase.from('tareas').select('id, titulo, estado, fecha_limite')
      .eq('tipo', 'solicitud_venta').eq('solicitante_id', ctx.userId).order('created_at', { ascending: false }).limit(3),
  ])

  const proximos = (turnos ?? [])
    .map((t) => ({ ...t, p: t.programa as unknown as { titulo: string; fecha: string } }))
    .sort((a, b) => a.p.fecha.localeCompare(b.p.fecha)).slice(0, 3)
  const nombre = ctx.persona.nombre_completo.split(' ')[0]
  const fechaHoy = new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())

  return (
    <Pagina ancho="estrecho" titulo={`${saludo()}, ${nombre}`} subtitulo={<span className="capitalize">{fechaHoy}</span>}>
      {ctx.esServidor && (
        <Grupo titulo="Mis próximos turnos" accion={<a href="/mi/servicio" className="text-[15px]" style={{ color: 'var(--accent)' }}>Ver todo</a>}>
          {proximos.map(({ p, ...t }, i) => {
            const rol = (t.rol as unknown as { nombre: string } | null)?.nombre ?? 'Servicio'
            return (
              <Fila key={t.id} primero={i === 0} href="/mi/servicio"
                inicio={<IconoModulo icon={CalendarCheck} color="#ff2d55" tamano={36} />}
                titulo={rol} subtitulo={`${p.titulo} · ${formatDate(p.fecha)}`} />
            )
          })}
          {!proximos.length && <Fila primero titulo={<span style={{ color: 'var(--muted)' }}>No tienes turnos programados</span>} />}
        </Grupo>
      )}

      {ctx.esServidor && (
        <Grupo titulo="Tareas por entregar">
          {(tareas ?? []).map((t, i) => {
            const est = estadoTarea(t.estado)
            return (
              <Fila key={t.id} primero={i === 0} href={`/mi/tareas/${t.id}`}
                inicio={<IconoModulo icon={ClipboardList} color="#f5b400" tamano={36} />}
                titulo={t.titulo} subtitulo={t.fecha_limite ? `Vence el ${formatDate(t.fecha_limite)}` : 'Sin fecha límite'}
                detalle={<Badge variant={est.variant}>{est.label}</Badge>} />
            )
          })}
          {!tareas?.length && <Fila primero titulo={<span style={{ color: 'var(--muted)' }}>Estás al día con tus tareas</span>} />}
        </Grupo>
      )}

      <Grupo titulo="Accesos rápidos">
        {ctx.esEstudiante && (
          <Fila primero href="/taller" inicio={<IconoModulo icon={School} color="#af52de" tamano={36} />}
            titulo="Academia" subtitulo="Tus cursos, clases y exámenes" />
        )}
        <Fila primero={!ctx.esEstudiante} href="/mi/solicitudes" inicio={<IconoModulo icon={ShoppingBag} color="#00c7be" tamano={36} />}
          titulo="Pedir permiso para vender" subtitulo="Después del culto" />
        <Fila href="/mi/aportes" inicio={<IconoModulo icon={Wallet} color="#34c759" tamano={36} />}
          titulo="Mis aportes" subtitulo="Diezmos, ofrendas y pactos" />
      </Grupo>

      {!!solicitudes?.length && (
        <Grupo titulo="Mis solicitudes recientes">
          {solicitudes.map((s, i) => {
            const est = estadoTarea(s.estado)
            return (
              <Fila key={s.id} primero={i === 0} href="/mi/solicitudes" titulo={s.titulo}
                subtitulo={s.fecha_limite ? formatDate(s.fecha_limite) : undefined}
                detalle={<Badge variant={est.variant}>{est.label}</Badge>} />
            )
          })}
        </Grupo>
      )}
    </Pagina>
  )
}
