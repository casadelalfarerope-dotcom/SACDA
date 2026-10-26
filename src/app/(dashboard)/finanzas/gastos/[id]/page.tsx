import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { etiquetaCategoriaGasto, etiquetaMedio, type Medio } from '@/lib/etiquetas'
import { formatDate } from '@/lib/utils'
import { Pagina, Grupo, Fila } from '@/components/ui/ios'
import { EditarGasto, type GastoEditable } from '@/components/finanzas/EditarRegistro'

const soles = (n: number) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n)

export default async function GastoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const [{ data: g }, { data: puedeEditar }, { data: puedeEliminar }] = await Promise.all([
    supabase.from('gastos').select('id, concepto, monto, fecha, categoria, descripcion, fondo_id, medio, fondo:fondos(nombre)').eq('id', id).maybeSingle(),
    supabase.rpc('tiene_permiso', { p_modulo: 'finanzas', p_accion: 'editar' }),
    supabase.rpc('tiene_permiso', { p_modulo: 'finanzas', p_accion: 'eliminar' }),
  ])
  if (!g) notFound()
  const gasto: GastoEditable = {
    id: g.id, concepto: g.concepto, monto: Number(g.monto), fecha: g.fecha, categoria: g.categoria,
    descripcion: g.descripcion, fondo_id: g.fondo_id, medio: g.medio as Medio,
  }
  const fondo = (g.fondo as unknown as { nombre: string } | null)?.nombre ?? 'Fondo General'

  return (
    <Pagina ancho="estrecho" titulo={soles(gasto.monto)} subtitulo={gasto.concepto} volver={{ href: '/finanzas/gastos', texto: 'Gastos' }}>
      {puedeEditar !== true && (
        <Grupo>
          <Fila primero titulo="Fecha" detalle={formatDate(gasto.fecha)} />
          <Fila titulo="Categoría" detalle={etiquetaCategoriaGasto(gasto.categoria)} />
          <Fila titulo="Medio" detalle={etiquetaMedio(gasto.medio)} />
          <Fila titulo="Fondo" detalle={fondo} />
          {gasto.descripcion && <Fila titulo="Descripción" detalle={gasto.descripcion} />}
        </Grupo>
      )}
      <EditarGasto gasto={gasto} puedeEditar={puedeEditar === true} puedeEliminar={puedeEliminar === true} />
    </Pagina>
  )
}
