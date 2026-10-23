import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Cake, Church, UserX, UserPlus, Download } from 'lucide-react'
import { diasParaCumpleanios, formatDateShort } from '@/lib/utils'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import { IconoModulo } from '@/components/ui/IconoApp'
import { Pagina, Grupo, Fila, BotonEnlace } from '@/components/ui/ios'

export default async function MiembrosPage() {
  const supabase = await createClient()

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
    <Pagina titulo="Seguimiento" subtitulo="Cumpleaños, visitas, ausencias y ceremonias"
      acciones={<>
        <BotonEnlace href="/miembros/ceremonias/nueva" variante="tintado"><Church size={15} aria-hidden="true" /> Ceremonia</BotonEnlace>
        <BotonEnlace href="/miembros/ausencias/nueva" variante="tintado"><UserX size={15} aria-hidden="true" /> Ausencia</BotonEnlace>
        <BotonEnlace href="/miembros/visitas/nueva"><UserPlus size={15} aria-hidden="true" /> Visita</BotonEnlace>
      </>}>

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
        <Grupo titulo="Visitas por seguir" accion={ver('/miembros/visitas')}>
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

        <Grupo titulo="Ausencias por atender" accion={ver('/miembros/ausencias')}>
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
