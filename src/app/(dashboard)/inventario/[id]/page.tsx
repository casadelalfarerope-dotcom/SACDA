import { etiquetaCategoriaBien, etiquetaEstadoBien } from '@/lib/etiquetas'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Wrench, Pencil } from 'lucide-react'
import { Pagina, Grupo, Fila, Tarjeta, BotonEnlace } from '@/components/ui/ios'
import { IconoModulo } from '@/components/ui/IconoApp'
import { formatDate } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import CambiarEstadoBienBtn from '@/components/inventario/CambiarEstadoBienBtn'
import RegistrarMantenimientoForm from '@/components/inventario/RegistrarMantenimientoForm'

const estadoVariant: Record<string, 'success' | 'warning' | 'error' | 'muted'> = {
  bueno: 'success', regular: 'warning', malo: 'error', baja: 'muted',
}

export default async function BienDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: bien }, { data: historial }] = await Promise.all([
    supabase.from('bienes').select('*').eq('id', id).single(),
    supabase.from('mantenimiento_historial').select('*').eq('bien_id', id).order('fecha', { ascending: false }),
  ])

  if (!bien) notFound()

  const campos = [
    { label: 'Categoría', value: etiquetaCategoriaBien(bien.categoria) },
    { label: 'N° de serie', value: bien.numero_serie },
    { label: 'Fecha de compra', value: bien.fecha_compra ? formatDate(bien.fecha_compra) : null },
    { label: 'Vida útil', value: bien.vida_util_anios ? `${bien.vida_util_anios} años` : null },
    { label: 'Próximo mantenimiento', value: bien.proximo_mantenimiento ? formatDate(bien.proximo_mantenimiento) : null },
    { label: 'Intervalo de mantenimiento', value: bien.intervalo_mantenimiento_dias ? `Cada ${bien.intervalo_mantenimiento_dias} días` : null },
    { label: 'Descripción', value: bien.descripcion },
  ].filter((c) => c.value)

  return (
    <Pagina ancho="estrecho" titulo={bien.nombre} volver={{ href: '/inventario', texto: 'Inventario' }}
      acciones={<>
        <Badge variant={estadoVariant[bien.estado] ?? 'muted'}>{etiquetaEstadoBien(bien.estado)}</Badge>
        <BotonEnlace href={`/inventario/${id}/editar`} variante="tintado"><Pencil size={14} aria-hidden="true" /> Editar</BotonEnlace>
      </>}>

      <Grupo titulo="Información">
        {campos.map((c, i) => (
          <Fila key={c.label} primero={i === 0} titulo={<span className="text-[15px]" style={{ color: 'var(--muted)' }}>{c.label}</span>}
            detalle={<span style={{ color: 'var(--foreground)' }}>{c.value}</span>} />
        ))}
      </Grupo>

      <Tarjeta titulo="Estado">
        <CambiarEstadoBienBtn bienId={id} estadoActual={bien.estado} />
      </Tarjeta>

      <Tarjeta titulo="Registrar mantenimiento">
        <RegistrarMantenimientoForm bienId={id} />
      </Tarjeta>

      <Grupo titulo={`Historial (${(historial ?? []).length})`}>
        {(historial ?? []).map((h, i) => (
          <Fila key={h.id} primero={i === 0} inicio={<IconoModulo icon={Wrench} color="#8e8e93" />}
            titulo={h.descripcion}
            subtitulo={`${formatDate(h.fecha)}${h.realizado_por ? ` · ${h.realizado_por}` : ''}`}
            detalle={h.costo ? <span className="tabular-nums">S/ {Number(h.costo).toFixed(2)}</span> : undefined} />
        ))}
        {(!historial || historial.length === 0) && <Fila primero titulo={<span style={{ color: 'var(--muted)' }}>Sin historial de mantenimiento</span>} />}
      </Grupo>
    </Pagina>
  )
}
