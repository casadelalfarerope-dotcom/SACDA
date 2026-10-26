import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { etiquetaTipoAporte, etiquetaMedio, type Medio } from '@/lib/etiquetas'
import { formatDate } from '@/lib/utils'
import { Pagina, Grupo, Fila } from '@/components/ui/ios'
import { EditarAporte, type AporteEditable } from '@/components/finanzas/EditarRegistro'

const soles = (n: number) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n)

export default async function AportePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const [{ data: a }, { data: puedeEditar }, { data: puedeEliminar }] = await Promise.all([
    supabase.from('aportes').select('id, tipo, monto, fecha, concepto, fondo_id, medio, persona:personas(id, nombre_completo, foto_url), fondo:fondos(nombre)').eq('id', id).maybeSingle(),
    supabase.rpc('tiene_permiso', { p_modulo: 'finanzas', p_accion: 'editar' }),
    supabase.rpc('tiene_permiso', { p_modulo: 'finanzas', p_accion: 'eliminar' }),
  ])
  if (!a) notFound()
  const persona = a.persona as unknown as AporteEditable['persona']
  const aporte: AporteEditable = {
    id: a.id, persona, tipo: a.tipo as AporteEditable['tipo'], monto: Number(a.monto), fecha: a.fecha,
    concepto: a.concepto, fondo_id: a.fondo_id, medio: a.medio as Medio,
  }
  const fondo = (a.fondo as unknown as { nombre: string } | null)?.nombre ?? 'Fondo General'

  return (
    <Pagina ancho="estrecho" titulo={soles(aporte.monto)} subtitulo={`${etiquetaTipoAporte(aporte.tipo)} de ${persona?.nombre_completo ?? 'Anónimo'}`}
      volver={{ href: '/finanzas/aportes', texto: 'Aportes' }}>
      {puedeEditar !== true && (
        <Grupo>
          <Fila primero titulo="Fecha" detalle={formatDate(aporte.fecha)} />
          <Fila titulo="Medio" detalle={etiquetaMedio(aporte.medio)} />
          <Fila titulo="Fondo" detalle={fondo} />
          {aporte.concepto && <Fila titulo="Nota" detalle={aporte.concepto} />}
        </Grupo>
      )}
      <EditarAporte aporte={aporte} puedeEditar={puedeEditar === true} puedeEliminar={puedeEliminar === true} />
    </Pagina>
  )
}
