import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { saldosFondos, movimientosDeFondo } from '@/lib/fondos'
import { Pagina } from '@/components/ui/ios'
import { ResumenFondo, ListaMovimientos } from '@/components/fondos/VistaFondo'
import { FormMovimiento, FormTraspaso, EditarFondo } from '@/components/fondos/FormulariosFondo'

export default async function FondoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const [{ data: puedeVer }, { data: puedeCrear }, { data: puedeEditar }, { data: puedeEliminar }] = await Promise.all([
    supabase.rpc('tiene_permiso', { p_modulo: 'finanzas', p_accion: 'ver' }),
    supabase.rpc('tiene_permiso', { p_modulo: 'finanzas', p_accion: 'crear' }),
    supabase.rpc('tiene_permiso', { p_modulo: 'finanzas', p_accion: 'editar' }),
    supabase.rpc('tiene_permiso', { p_modulo: 'finanzas', p_accion: 'eliminar' }),
  ])
  if (puedeVer !== true) redirect('/')

  const admin = createServiceClient()
  const { data: fondo } = await admin.from('fondos').select('id, nombre, descripcion, grupo_id, meta, activo, grupo:grupos(nombre)').eq('id', id).maybeSingle()
  if (!fondo) notFound()
  const [saldos, movimientos, { data: grupos }, { data: otros }] = await Promise.all([
    saldosFondos(admin),
    movimientosDeFondo(admin, id),
    admin.from('grupos').select('id, nombre').eq('activo', true).order('nombre'),
    admin.from('fondos').select('id, nombre').eq('activo', true).order('nombre'),
  ])
  const saldo = saldos.get(id) ?? { entradas: 0, salidas: 0, saldo: 0 }
  const ministerio = (fondo.grupo as unknown as { nombre: string } | null)?.nombre
  const meta = fondo.meta === null ? null : Number(fondo.meta)

  return (
    <Pagina ancho="estrecho" titulo={fondo.nombre} volver={{ href: '/finanzas/fondos', texto: 'Fondos' }}
      subtitulo={[ministerio ? `Ministerio: ${ministerio}` : 'Lo maneja Tesorería', fondo.descripcion, !fondo.activo && 'Cerrado'].filter(Boolean).join(' · ')}>
      <ResumenFondo saldo={saldo} meta={meta} />

      {puedeCrear === true && (
        <section className="space-y-2">
          <h2 className="px-1 text-[17px] font-semibold" style={{ color: 'var(--foreground)' }}>Registrar movimiento</h2>
          <FormMovimiento fondoId={id} saldo={saldo.saldo} />
          <p className="px-1 text-[13px]" style={{ color: 'var(--muted)' }}>
            También puedes elegir este fondo al registrar un aporte, un gasto o una actividad.
          </p>
        </section>
      )}

      <ListaMovimientos movimientos={movimientos} conEnlaces puedeBorrar={() => puedeEliminar === true} />

      {puedeCrear === true && (
        <section className="space-y-2">
          <h2 className="px-1 text-[17px] font-semibold" style={{ color: 'var(--foreground)' }}>Pasar dinero</h2>
          <FormTraspaso hacia={id} fondos={(otros ?? []).map((f) => ({ value: f.id, label: f.nombre }))} />
        </section>
      )}

      {puedeEditar === true && (
        <EditarFondo fondo={{ id: fondo.id, nombre: fondo.nombre, descripcion: fondo.descripcion, grupo_id: fondo.grupo_id, meta, activo: fondo.activo }}
          ministerios={(grupos ?? []).map((g) => ({ value: g.id, label: g.nombre }))} />
      )}
    </Pagina>
  )
}
