import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { contextoEspacio, misMinisterios } from '@/lib/espacio'
import { saldosFondos, movimientosDeFondo } from '@/lib/fondos'
import { Pagina } from '@/components/ui/ios'
import { ResumenFondo, ListaMovimientos } from '@/components/fondos/VistaFondo'
import { FormMovimiento } from '@/components/fondos/FormulariosFondo'

// Fondo del ministerio visto por su líder: saldo, registrar ingresos y gastos.
export default async function FondoMinisterioPage({ params }: { params: Promise<{ id: string; fondoId: string }> }) {
  const { id, fondoId } = await params
  const ctx = await contextoEspacio()
  const mio = (await misMinisterios(ctx.personaId)).find((m) => m.id === id)
  if (!mio?.esLider) notFound()

  const admin = createServiceClient()
  const { data: fondo } = await admin.from('fondos').select('id, nombre, descripcion, meta, activo')
    .eq('id', fondoId).eq('grupo_id', id).maybeSingle()
  if (!fondo) notFound()
  const [saldos, movimientos] = await Promise.all([saldosFondos(admin), movimientosDeFondo(admin, fondoId)])
  const saldo = saldos.get(fondoId) ?? { entradas: 0, salidas: 0, saldo: 0 }

  return (
    <Pagina ancho="estrecho" titulo={fondo.nombre} subtitulo={fondo.descripcion ?? `Fondo de ${mio.nombre}`}
      volver={{ href: `/mi/ministerios/${id}`, texto: mio.nombre }}>
      <ResumenFondo saldo={saldo} meta={fondo.meta === null ? null : Number(fondo.meta)} />
      {fondo.activo && (
        <section className="space-y-2">
          <h2 className="px-1 text-[17px] font-semibold" style={{ color: 'var(--foreground)' }}>Registrar movimiento</h2>
          <FormMovimiento fondoId={fondoId} saldo={saldo.saldo} />
        </section>
      )}
      {/* El líder solo puede borrar lo que él mismo registró (no traspasos ni lo de Tesorería). */}
      <ListaMovimientos movimientos={movimientos} conEnlaces={false}
        puedeBorrar={(m) => !m.traspaso && m.registradoPor === ctx.personaId} />
    </Pagina>
  )
}
