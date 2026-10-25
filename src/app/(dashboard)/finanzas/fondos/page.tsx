import { redirect } from 'next/navigation'
import { PiggyBank } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { saldosFondos, soles } from '@/lib/fondos'
import { Pagina, Grupo, Fila, Vacio } from '@/components/ui/ios'
import { EnlaceFondo } from '@/components/fondos/VistaFondo'
import { FormFondo, FormTraspaso } from '@/components/fondos/FormulariosFondo'

// Fondos: dinero apartado para un ministerio o una meta, cada uno con su saldo.
export default async function FondosPage() {
  const supabase = await createClient()
  const [{ data: puedeVer }, { data: puedeCrear }] = await Promise.all([
    supabase.rpc('tiene_permiso', { p_modulo: 'finanzas', p_accion: 'ver' }),
    supabase.rpc('tiene_permiso', { p_modulo: 'finanzas', p_accion: 'crear' }),
  ])
  if (puedeVer !== true) redirect('/')

  const admin = createServiceClient()
  const [{ data: fondos }, { data: grupos }, saldos] = await Promise.all([
    admin.from('fondos').select('id, nombre, meta, activo, grupo:grupos(nombre)').order('nombre'),
    admin.from('grupos').select('id, nombre').eq('activo', true).order('nombre'),
    saldosFondos(admin),
  ])
  const lista = (fondos ?? []).map((f) => ({ ...f, ministerio: (f.grupo as unknown as { nombre: string } | null)?.nombre ?? null, saldo: saldos.get(f.id)?.saldo ?? 0 }))
  const activos = lista.filter((f) => f.activo)
  const general = saldos.get('general')?.saldo ?? 0
  const total = [...saldos.values()].reduce((s, v) => s + v.saldo, 0)

  return (
    <Pagina ancho="estrecho" titulo="Fondos" subtitulo="Dinero apartado para cada ministerio o meta" volver={{ href: '/finanzas', texto: 'Finanzas' }}>
      <section aria-label="Total" className="rounded-2xl border p-5" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <p className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Total de la iglesia</p>
        <p className="text-[34px] leading-tight font-bold tabular-nums tracking-tight mt-1" style={{ color: total < 0 ? 'var(--error)' : 'var(--foreground)' }}>{soles(total)}</p>
        <p className="text-[13px] mt-1" style={{ color: 'var(--muted)' }}>Suma del Fondo General y todos los fondos.</p>
      </section>

      <Grupo titulo="Fondos" pie="Lo que no se asigna a ningún fondo queda en el Fondo General.">
        <Fila primero titulo="Fondo General" subtitulo="Caja principal de la iglesia"
          detalle={<span className="font-semibold tabular-nums" style={{ color: general < 0 ? 'var(--error)' : 'var(--foreground)' }}>{soles(general)}</span>} />
        {activos.map((f) => (
          <EnlaceFondo key={f.id} primero={false} href={`/finanzas/fondos/${f.id}`} nombre={f.nombre} saldo={f.saldo} meta={f.meta === null ? null : Number(f.meta)} ministerio={f.ministerio} />
        ))}
      </Grupo>
      {!activos.length && <Vacio icono={<PiggyBank size={44} />} titulo="Aún no hay fondos" texto="Crea uno para separar dinero de un ministerio (por ejemplo Jóvenes) o para una meta (por ejemplo renovar instrumentos)." />}

      {puedeCrear === true && activos.length > 0 && (
        <section className="space-y-2">
          <h2 className="px-1 text-[17px] font-semibold" style={{ color: 'var(--foreground)' }}>Pasar dinero entre fondos</h2>
          <FormTraspaso fondos={activos.map((f) => ({ value: f.id, label: f.nombre }))} />
        </section>
      )}

      {puedeCrear === true && (
        <section className="space-y-2">
          <h2 className="px-1 text-[17px] font-semibold" style={{ color: 'var(--foreground)' }}>Nuevo fondo</h2>
          <FormFondo ministerios={(grupos ?? []).map((g) => ({ value: g.id, label: g.nombre }))} />
        </section>
      )}

      {lista.length > activos.length && (
        <Grupo titulo="Fondos cerrados">
          {lista.filter((f) => !f.activo).map((f, i) => (
            <EnlaceFondo key={f.id} primero={i === 0} href={`/finanzas/fondos/${f.id}`} nombre={f.nombre} saldo={f.saldo} meta={null} ministerio={f.ministerio} />
          ))}
        </Grupo>
      )}
    </Pagina>
  )
}
