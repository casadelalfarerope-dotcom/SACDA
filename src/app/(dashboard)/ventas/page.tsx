import { createClient } from '@/lib/supabase/server'
import { Plus, ShoppingBag } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import { IconoModulo } from '@/components/ui/IconoApp'
import { Pagina, Grupo, Fila, SegmentadoEnlaces, BotonEnlace, Vacio } from '@/components/ui/ios'

const ESTADO: Record<string, { label: string; variant: 'warning' | 'info' | 'success' | 'error' | 'muted' }> = {
  pendiente:   { label: 'Pendiente',   variant: 'warning' },
  en_progreso: { label: 'En progreso', variant: 'info' },
  entregado:   { label: 'Por revisar', variant: 'info' },
  aprobado:    { label: 'Aprobada',    variant: 'success' },
  rechazado:   { label: 'Rechazada',   variant: 'error' },
}

export default async function VentasPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('tareas')
    .select('*, asignado:personas!tareas_asignado_id_fkey(nombre_completo), solicitante:cuentas!tareas_solicitante_id_fkey(persona:personas(nombre_completo))')
    .eq('tipo', 'solicitud_venta')
    .order('created_at', { ascending: false })
  if (params.estado) query = query.eq('estado', params.estado)
  const { data: solicitudes } = await query

  const lista = solicitudes ?? []
  const activas = lista.filter((s) => !['aprobado', 'rechazado'].includes(s.estado))
  const cerradas = lista.filter((s) => ['aprobado', 'rechazado'].includes(s.estado))
  const solicitante = (s: { solicitante: unknown }) => (s.solicitante as { persona: { nombre_completo: string } | null } | null)?.persona?.nombre_completo ?? 'Sin solicitante'

  const filas = (items: typeof lista, apagadas = false) => items.map((s, i) => {
    const est = ESTADO[s.estado] ?? { label: s.estado, variant: 'muted' as const }
    return (
      <Fila key={s.id} href={`/tareas/${s.id}`} primero={i === 0}
        inicio={apagadas ? undefined : <IconoModulo icon={ShoppingBag} color="#00c7be" tamano={36} />}
        titulo={apagadas ? <span style={{ color: 'var(--muted)' }}>{s.titulo}</span> : s.titulo}
        subtitulo={[solicitante(s), s.fecha_limite && formatDate(s.fecha_limite)].filter(Boolean).join(' · ')}
        detalle={<Badge variant={est.variant}>{est.label}</Badge>} />
    )
  })

  return (
    <Pagina titulo="Ventas" subtitulo={`${activas.length} ${activas.length === 1 ? 'solicitud activa' : 'solicitudes activas'}`}
      acciones={<BotonEnlace href="/tareas/nueva?tipo=solicitud_venta" etiqueta="Nueva solicitud de venta"><Plus size={17} aria-hidden="true" /><span className="hidden sm:inline">Nueva</span></BotonEnlace>}>

      <SegmentadoEnlaces etiqueta="Filtrar por estado" actual={params.estado ?? ''}
        opciones={[{ valor: '', texto: 'Todas', href: '/ventas' },
          ...['pendiente', 'en_progreso', 'aprobado', 'rechazado'].map((e) => ({ valor: e, texto: ESTADO[e]!.label, href: `/ventas?estado=${e}` }))]} />

      {lista.length === 0 && <Vacio icono={<ShoppingBag size={44} />} titulo="Sin solicitudes de venta" texto="Cuando un hermano pida vender algo después del culto, regístralo con el botón +." />}
      {activas.length > 0 && <Grupo titulo="Activas">{filas(activas)}</Grupo>}
      {cerradas.length > 0 && <Grupo titulo="Cerradas">{filas(cerradas, true)}</Grupo>}
    </Pagina>
  )
}
