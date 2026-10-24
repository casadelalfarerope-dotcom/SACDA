import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Cake, Church, UserX, UserPlus, Download, BarChart3, ClipboardCheck, House } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/service'
import { diasConLista, cerrarListasPendientes } from '@/lib/asistencia'
import { hoyLima, formatDate } from '@/lib/utils'
import PasarLista from '@/components/miembros/PasarLista'
import { diasParaCumpleanios, formatDateShort } from '@/lib/utils'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import { IconoModulo } from '@/components/ui/IconoApp'
import { Pagina, Grupo, Fila, BotonEnlace } from '@/components/ui/ios'

export default async function MiembrosPage({ searchParams }: { searchParams: Promise<{ dia?: string }> }) {
  const supabase = await createClient()
  const { dia: diaParam } = await searchParams

  // Pasar lista: el culto de hoy (o el último que pasó). Las listas de días
  // anteriores se cierran solas y generan las ausencias.
  await cerrarListasPendientes(createServiceClient())
  const hoy = hoyLima()
  const hace = new Date(hoy + 'T12:00:00Z'); hace.setUTCDate(hace.getUTCDate() - 21)
  const dias = (await diasConLista(supabase, hace.toISOString().slice(0, 10), hoy)).filter((d) => d.fecha_real <= hoy).reverse()
  const elegido = dias.find((d) => `${d.evento_id}|${d.fecha}` === diaParam) ?? dias[0]
  const [{ data: activos }, { data: vinieron }, { data: cierre }, { data: puedeCerrar }] = elegido
    ? await Promise.all([
      supabase.from('personas').select('id, nombre_completo, foto_url, estado').in('estado', ['activo', 'visita']).order('nombre_completo'),
      supabase.from('asistencia_culto').select('persona_id').eq('evento_id', elegido.evento_id).eq('fecha', elegido.fecha),
      supabase.from('asistencia_culto_cierres').select('evento_id').eq('evento_id', elegido.evento_id).eq('fecha', elegido.fecha).maybeSingle(),
      supabase.rpc('tiene_permiso', { p_modulo: 'miembros', p_accion: 'crear' }),
    ])
    : [{ data: [] }, { data: [] }, { data: null }, { data: false }] as const

  // Cumpleaños próximos (30 días)
  const { data: todasPersonas } = await supabase
    .from('personas')
    .select('id, nombre_completo, foto_url, fecha_nacimiento, ministerio')
    .eq('estado', 'activo')
    .not('fecha_nacimiento', 'is', null)
    .order('nombre_completo')

  const cumpleProximos = (todasPersonas ?? [])
    .map((p) => ({ ...p, diasFaltan: diasParaCumpleanios(p.fecha_nacimiento!) }))
    .filter((p) => p.diasFaltan <= 30)
    .sort((a, b) => a.diasFaltan - b.diasFaltan)
    .slice(0, 8)

  // Visitas pendientes de seguimiento
  const { data: visitas } = await supabase
    .from('seguimiento_visitas')
    .select('*, persona:personas!seguimiento_visitas_persona_id_fkey(id, nombre_completo, foto_url, ministerio)')
    .eq('estado', 'pendiente')
    .order('fecha_primera_visita', { ascending: false })
    .limit(10)

  // Ausencias pendientes
  const { data: ausencias } = await supabase
    .from('ausencias')
    .select('*, persona:personas!ausencias_persona_id_fkey(id, nombre_completo, foto_url)')
    .eq('estado', 'pendiente')
    .order('fecha', { ascending: false })
    .limit(10)

  // Ceremonias recientes
  const { data: ceremonias } = await supabase
    .from('ceremonias')
    .select('*, ceremonia_personas(rol_en_ceremonia, nombre_externo, persona:personas(nombre_completo))')
    .order('fecha', { ascending: false })
    .limit(5)

  const TIPO_CER = { bautismo: 'Bautismo', dedicacion: 'Dedicación', boda: 'Boda' } as const
  const ver = (href: string) => <Link href={href} className="text-[15px] normal-case" style={{ color: 'var(--accent)' }}>Ver todas</Link>

  return (
    <Pagina titulo="Seguimiento" subtitulo="Asistencia a los cultos, cumpleaños, visitas y ausencias"
      acciones={<>
        <BotonEnlace href="/miembros/estadisticas" variante="tintado"><BarChart3 size={15} aria-hidden="true" /> Estadísticas</BotonEnlace>
        <BotonEnlace href="/miembros/ceremonias/nueva" variante="tintado"><Church size={15} aria-hidden="true" /> Ceremonia</BotonEnlace>
        <BotonEnlace href="/miembros/visitas-pastorales" variante="tintado"><House size={15} aria-hidden="true" /> Visitas pastorales</BotonEnlace>
      </>}>

      <section aria-labelledby="lista-titulo" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2 px-1">
          <h2 id="lista-titulo" className="text-[22px] font-bold" style={{ color: 'var(--foreground)' }}>
            <ClipboardCheck size={20} aria-hidden="true" className="inline -mt-1 mr-1.5" style={{ color: 'var(--accent)' }} />
            Pasar lista
          </h2>
          {dias.length > 1 && (
            <details className="relative">
              <summary className="cursor-pointer text-[15px] font-medium" style={{ color: 'var(--accent)' }}>Otro culto</summary>
              <ul className="material absolute right-0 mt-2 w-72 max-h-80 overflow-y-auto rounded-2xl border p-1.5 z-20" style={{ borderColor: 'var(--border)', boxShadow: 'var(--shadow-float)' }}>
                {dias.map((d) => (
                  <li key={d.evento_id + d.fecha}>
                    <Link href={`/miembros?dia=${d.evento_id}|${d.fecha}`} className="block px-3 py-2 rounded-[10px] text-[14px] hover:bg-[color:var(--fill)]"
                      style={{ color: 'var(--foreground)', fontWeight: d === elegido ? 650 : 450 }}>
                      {d.titulo} · {d.fecha_real === hoy ? 'Hoy' : formatDate(d.fecha_real)}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
        {elegido ? (
          <>
            <p className="px-1 text-[15px]" style={{ color: 'var(--muted)' }}>
              <b style={{ color: 'var(--foreground)' }}>{elegido.titulo}</b> · {elegido.fecha_real === hoy ? 'Hoy' : formatDate(elegido.fecha_real)}{elegido.hora ? ` · ${elegido.hora.slice(0, 5)}` : ''}
            </p>
            <PasarLista key={elegido.evento_id + elegido.fecha} eventoId={elegido.evento_id} fecha={elegido.fecha} fechaReal={elegido.fecha_real}
              personas={(activos ?? []).map((p) => ({ id: p.id, nombre: p.nombre_completo, foto: p.foto_url, nuevo: p.estado === 'visita' }))}
              presentesIniciales={(vinieron ?? []).map((v) => v.persona_id)} cerrada={!!cierre} puedeCerrar={puedeCerrar === true} />
          </>
        ) : (
          <p className="px-1 text-[15px]" style={{ color: 'var(--muted)' }}>No hay cultos con asistencia en las últimas semanas. Activa “Tomar asistencia” en los eventos del Calendario.</p>
        )}
      </section>

      <Grupo pie="Excel con las visitas que faltan contactar y las ausencias por atender, con teléfono y dirección, para entregar a quien hará el seguimiento.">
        <li>
          <a href="/api/export/seguimiento" download className="flex items-center gap-3 pl-4 pr-4 min-h-[52px] transition-colors hover:bg-[color:var(--fill)]">
            <IconoModulo icon={Download} color="#34c759" />
            <span className="text-[15px] font-medium" style={{ color: 'var(--accent)' }}>Descargar reporte de seguimiento</span>
          </a>
        </li>
      </Grupo>

      <Grupo titulo="Cumpleaños · próximos 30 días">
        {cumpleProximos.map((p, i) => (
          <Fila key={p.id} href={`/congregantes/${p.id}`} primero={i === 0}
            inicio={<Avatar nombre={p.nombre_completo} fotoUrl={p.foto_url} size="sm" />}
            titulo={p.nombre_completo} subtitulo={p.ministerio ?? 'Sin ministerio'}
            detalle={p.diasFaltan === 0
              ? <span className="inline-flex items-center gap-1 font-semibold" style={{ color: 'var(--warning)' }}><Cake size={15} aria-hidden="true" /> Hoy</span>
              : p.diasFaltan === 1 ? 'Mañana' : `En ${p.diasFaltan} días`} />
        ))}
        {!cumpleProximos.length && <Fila primero titulo={<span style={{ color: 'var(--muted)' }}>Sin cumpleaños en los próximos 30 días</span>} />}
      </Grupo>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <Grupo titulo="Nuevos · ¿volvieron?" accion={ver('/miembros/visitas')}>
          {(visitas ?? []).map((v, i) => {
            const persona = Array.isArray(v.persona) ? v.persona[0] : v.persona
            return (
              <Fila key={v.id} href="/miembros/visitas" primero={i === 0}
                inicio={persona ? <Avatar nombre={persona.nombre_completo} fotoUrl={persona.foto_url} size="sm" /> : undefined}
                titulo={persona?.nombre_completo ?? '—'} subtitulo={`Primera visita: ${formatDateShort(v.fecha_primera_visita)}`}
                detalle={<Badge variant="warning">Pendiente</Badge>} />
            )
          })}
          {!visitas?.length && <Fila primero titulo={<span style={{ color: 'var(--muted)' }}>Sin visitas pendientes</span>} />}
        </Grupo>

        <Grupo titulo="Faltaron · por contactar" accion={ver('/miembros/ausencias')}>
          {(ausencias ?? []).map((a, i) => {
            const persona = Array.isArray(a.persona) ? a.persona[0] : a.persona
            return (
              <Fila key={a.id} href="/miembros/ausencias" primero={i === 0}
                inicio={persona ? <Avatar nombre={persona.nombre_completo} fotoUrl={persona.foto_url} size="sm" /> : undefined}
                titulo={persona?.nombre_completo ?? '—'} subtitulo={[formatDateShort(a.fecha), a.motivo].filter(Boolean).join(' · ')}
                detalle={<Badge variant="warning">Pendiente</Badge>} />
            )
          })}
          {!ausencias?.length && <Fila primero titulo={<span style={{ color: 'var(--muted)' }}>Sin ausencias pendientes</span>} />}
        </Grupo>
      </div>

      {!!ceremonias?.length && (
        <Grupo titulo="Ceremonias recientes" accion={ver('/miembros/ceremonias')}>
          {ceremonias.map((c, i) => {
            const nombres = (c.ceremonia_personas ?? [])
              .map((cp: { nombre_externo?: string | null; persona?: { nombre_completo: string } | null }) => cp.persona?.nombre_completo ?? cp.nombre_externo ?? '')
              .filter(Boolean).join(', ')
            return (
              <Fila key={c.id} primero={i === 0} inicio={<IconoModulo icon={Church} color="#5856d6" />}
                titulo={nombres || (TIPO_CER[c.tipo as keyof typeof TIPO_CER] ?? c.tipo)}
                subtitulo={[TIPO_CER[c.tipo as keyof typeof TIPO_CER] ?? c.tipo, formatDateShort(c.fecha), c.officiante && `Oficia: ${c.officiante}`].filter(Boolean).join(' · ')} />
            )
          })}
        </Grupo>
      )}
    </Pagina>
  )
}
