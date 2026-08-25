import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Wrench, Pencil } from 'lucide-react'
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
    { label: 'Categoría', value: bien.categoria },
    { label: 'N° de serie', value: bien.numero_serie },
    { label: 'Fecha de compra', value: bien.fecha_compra ? formatDate(bien.fecha_compra) : null },
    { label: 'Vida útil', value: bien.vida_util_anios ? `${bien.vida_util_anios} años` : null },
    { label: 'Próximo mantenimiento', value: bien.proximo_mantenimiento ? formatDate(bien.proximo_mantenimiento) : null },
    { label: 'Intervalo de mantenimiento', value: bien.intervalo_mantenimiento_dias ? `Cada ${bien.intervalo_mantenimiento_dias} días` : null },
    { label: 'Descripción', value: bien.descripcion },
  ].filter((c) => c.value)

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/inventario"
          className="p-2 rounded-xl hover:opacity-70 transition-opacity"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <ArrowLeft size={18} style={{ color: 'var(--foreground)' }} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>{bien.nombre}</h1>
        </div>
        <Link href={`/inventario/${id}/editar`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm border transition-opacity hover:opacity-70"
          style={{ borderColor: 'var(--border)', color: 'var(--foreground)', background: 'var(--surface)' }}>
          <Pencil size={14} /> Editar
        </Link>
        <Badge variant={estadoVariant[bien.estado] ?? 'muted'}>{bien.estado.replace('_', ' ')}</Badge>
      </div>

      {/* Info */}
      <div className="p-4 rounded-2xl border mb-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="space-y-2">
          {campos.map((c) => (
            <div key={c.label} className="flex items-start gap-2">
              <span className="text-xs w-40 flex-shrink-0 pt-0.5" style={{ color: 'var(--muted)' }}>{c.label}</span>
              <span className="text-sm" style={{ color: 'var(--foreground)' }}>{c.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Cambiar estado */}
      <div className="p-4 rounded-2xl border mb-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <p className="text-sm font-semibold mb-3" style={{ color: 'var(--foreground)' }}>Cambiar estado</p>
        <CambiarEstadoBienBtn bienId={id} estadoActual={bien.estado} />
      </div>

      {/* Registrar mantenimiento */}
      <div className="p-4 rounded-2xl border mb-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Wrench size={15} style={{ color: 'var(--muted)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Registrar mantenimiento</p>
        </div>
        <RegistrarMantenimientoForm bienId={id} />
      </div>

      {/* Historial */}
      <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--foreground)' }}>
        Historial ({(historial ?? []).length})
      </h2>
      <div className="space-y-2">
        {(historial ?? []).map((h) => (
          <div key={h.id} className="p-4 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>{h.descripcion}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                  {formatDate(h.fecha)}
                  {h.realizado_por ? ` · ${h.realizado_por}` : ''}
                </p>
              </div>
              {h.costo && (
                <span className="text-sm font-semibold" style={{ color: 'var(--error)' }}>
                  S/ {Number(h.costo).toFixed(2)}
                </span>
              )}
            </div>
          </div>
        ))}
        {(!historial || historial.length === 0) && (
          <p className="text-center py-8 text-sm" style={{ color: 'var(--muted)' }}>Sin historial de mantenimiento</p>
        )}
      </div>
    </div>
  )
}
