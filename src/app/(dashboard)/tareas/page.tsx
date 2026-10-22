import { createClient } from '@/lib/supabase/server'
import { Plus, ClipboardList, Palette, ShoppingBag, GraduationCap, type LucideIcon } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import { IconoModulo } from '@/components/ui/IconoApp'
import { Pagina, Grupo, Fila, SegmentadoEnlaces, BotonEnlace, Vacio } from '@/components/ui/ios'

const estadoLabel: Record<string, string> = {
  pendiente: 'Pendiente', en_progreso: 'En progreso', entregado: 'Entregado', aprobado: 'Aprobado', rechazado: 'Rechazado',
}
const estadoColor: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  pendiente: 'warning', en_progreso: 'info', entregado: 'default', aprobado: 'success', rechazado: 'error',
}
const TIPO: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  diseno:          { label: 'Diseño',       icon: Palette,       color: '#ff2d55' },
  solicitud_venta: { label: 'Venta',        icon: ShoppingBag,   color: '#00c7be' },
  capacitacion:    { label: 'Capacitación', icon: GraduationCap, color: '#32ade6' },
  otro:            { label: 'Otro',         icon: ClipboardList, color: '#8e8e93' },
}

const FILTROS = [
  { valor: '', texto: 'Todas', href: '/tareas' },
  { valor: 'diseno', texto: 'Diseño', href: '/tareas?tipo=diseno' },
  { valor: 'solicitud_venta', texto: 'Ventas', href: '/tareas?tipo=solicitud_venta' },
  { valor: 'pendiente', texto: 'Pendientes', href: '/tareas?estado=pendiente' },
  { valor: 'entregado', texto: 'Revisar', href: '/tareas?estado=entregado' },
]

export default async function TareasPage({ searchParams }: { searchParams: Promise<{ tipo?: string; estado?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase.from('tareas').select('*, personas:asignado_id(nombre_completo)').order('created_at', { ascending: false })
  if (params.tipo) query = query.eq('tipo', params.tipo)
  if (params.estado) query = query.eq('estado', params.estado)
  const { data: tareas } = await query.limit(60)

  const activas = tareas?.filter((t) => !['aprobado', 'rechazado'].includes(t.estado)) ?? []
  const cerradas = tareas?.filter((t) => ['aprobado', 'rechazado'].includes(t.estado)) ?? []
  const asignado = (t: { personas: unknown }) => (t.personas as { nombre_completo: string } | null)?.nombre_completo

  return (
    <Pagina titulo="Tareas" subtitulo="Diseño, ventas y capacitación con aprobación"
      acciones={<BotonEnlace href="/tareas/nueva" etiqueta="Nueva tarea"><Plus size={17} aria-hidden="true" /><span className="hidden sm:inline">Nueva</span></BotonEnlace>}>

      <SegmentadoEnlaces etiqueta="Filtrar tareas" actual={params.tipo ?? params.estado ?? ''} opciones={FILTROS} />

      {!tareas?.length && <Vacio icono={<ClipboardList size={44} />} titulo="Sin tareas" texto="Crea la primera tarea de diseño o solicitud con el botón +." />}

      {activas.length > 0 && (
        <Grupo titulo="Activas">
          {activas.map((t, i) => {
            const tipo = TIPO[t.tipo] ?? TIPO.otro!
            return (
              <Fila key={t.id} href={`/tareas/${t.id}`} primero={i === 0}
                inicio={<IconoModulo icon={tipo.icon} color={tipo.color} tamano={36} />}
                titulo={t.titulo}
                subtitulo={[tipo.label, asignado(t) && `Asignado a ${asignado(t)}`, t.fecha_limite && `Vence ${formatDate(t.fecha_limite)}`].filter(Boolean).join(' · ')}
                detalle={<Badge variant={estadoColor[t.estado] ?? 'default'}>{estadoLabel[t.estado] ?? t.estado}</Badge>} />
            )
          })}
        </Grupo>
      )}

      {cerradas.length > 0 && (
        <Grupo titulo="Cerradas">
          {cerradas.slice(0, 15).map((t, i) => (
            <Fila key={t.id} href={`/tareas/${t.id}`} primero={i === 0}
              titulo={<span style={{ color: 'var(--muted)' }}>{t.titulo}</span>}
              subtitulo={(TIPO[t.tipo] ?? TIPO.otro!).label}
              detalle={<Badge variant={estadoColor[t.estado] ?? 'default'}>{estadoLabel[t.estado] ?? t.estado}</Badge>} />
          ))}
        </Grupo>
      )}
    </Pagina>
  )
}
