import { etiquetaCategoriaBien, etiquetaEstadoBien } from '@/lib/etiquetas'
import { createClient } from '@/lib/supabase/server'
import { Plus, AlertTriangle, Package, Guitar, Speaker, Video, Armchair, type LucideIcon } from 'lucide-react'
import { formatDate, hoyLima } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import { IconoModulo } from '@/components/ui/IconoApp'
import { Pagina, Grupo, Fila, SegmentadoEnlaces, BotonEnlace, Vacio } from '@/components/ui/ios'

const estadoVariant: Record<string, 'success' | 'warning' | 'error' | 'muted'> = {
  bueno: 'success', regular: 'warning', malo: 'error', baja: 'muted',
}

const CATEGORIA: Record<string, { icon: LucideIcon; color: string }> = {
  instrumento:  { icon: Guitar,   color: '#ff9500' },
  equipo_audio: { icon: Speaker,  color: '#5856d6' },
  equipo_video: { icon: Video,    color: '#ff2d55' },
  mobiliario:   { icon: Armchair, color: '#a2845e' },
}

export default async function InventarioPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()
  const hoy = hoyLima()
  const en30dias = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]!

  let query = supabase.from('bienes').select('*').order('nombre')
  if (params.estado) query = query.eq('estado', params.estado)

  const [{ data: bienes }, { data: proximos }] = await Promise.all([
    query,
    supabase.from('bienes').select('id, nombre, proximo_mantenimiento')
      .lte('proximo_mantenimiento', en30dias).gte('proximo_mantenimiento', hoy).order('proximo_mantenimiento'),
  ])

  return (
    <Pagina titulo="Inventario" subtitulo={`${(bienes ?? []).length} bienes registrados`}
      acciones={<BotonEnlace href="/inventario/nuevo" etiqueta="Agregar bien"><Plus size={17} aria-hidden="true" /><span className="hidden sm:inline">Agregar</span></BotonEnlace>}>

      {(proximos ?? []).length > 0 && (
        <Grupo titulo="Mantenimiento en los próximos 30 días">
          {proximos!.map((b, i) => (
            <Fila key={b.id} href={`/inventario/${b.id}`} primero={i === 0}
              inicio={<IconoModulo icon={AlertTriangle} color="#ff9500" />}
              titulo={b.nombre} detalle={formatDate(b.proximo_mantenimiento)} />
          ))}
        </Grupo>
      )}

      <SegmentadoEnlaces etiqueta="Filtrar por estado" actual={params.estado ?? ''}
        opciones={[{ valor: '', texto: 'Todos', href: '/inventario' },
          ...['bueno', 'regular', 'malo', 'baja'].map((e) => ({ valor: e, texto: etiquetaEstadoBien(e), href: `/inventario?estado=${e}` }))]} />

      {!bienes?.length ? (
        <Vacio icono={<Package size={44} />} titulo="Sin bienes" texto="No hay bienes registrados con este filtro." />
      ) : (
        <Grupo>
          {bienes.map((b, i) => {
            const cat = (b.categoria && CATEGORIA[b.categoria]) || { icon: Package, color: '#8e8e93' }
            return (
              <Fila key={b.id} href={`/inventario/${b.id}`} primero={i === 0}
                inicio={<IconoModulo icon={cat.icon} color={cat.color} tamano={36} />}
                titulo={b.nombre}
                subtitulo={[etiquetaCategoriaBien(b.categoria), b.numero_serie,
                  b.proximo_mantenimiento ? `Mant. ${formatDate(b.proximo_mantenimiento)}` : null].filter(Boolean).join(' · ')}
                detalle={<Badge variant={estadoVariant[b.estado] ?? 'muted'}>{etiquetaEstadoBien(b.estado)}</Badge>} />
            )
          })}
        </Grupo>
      )}
    </Pagina>
  )
}
