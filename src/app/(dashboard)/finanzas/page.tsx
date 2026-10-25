import { createClient } from '@/lib/supabase/server'
import { Pagina, BotonEnlace } from '@/components/ui/ios'
import FinanzasTabs from './FinanzasTabs'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto',
               'Septiembre','Octubre','Noviembre','Diciembre']

export default async function FinanzasPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; anio?: string }>
}) {
  const params = await searchParams
  const hoy  = new Date()
  const mes  = parseInt(params.mes  ?? String(hoy.getMonth() + 1))
  const anio = parseInt(params.anio ?? String(hoy.getFullYear()))

  const mesStr = String(mes).padStart(2, '0')
  const desde  = `${anio}-${mesStr}-01`
  const hasta  = new Date(anio, mes, 0).toISOString().split('T')[0]!

  // 12 meses histórico para estadísticas
  const hace12 = new Date(hoy.getFullYear(), hoy.getMonth() - 11, 1)
  const desde12 = `${hace12.getFullYear()}-${String(hace12.getMonth() + 1).padStart(2, '0')}-01`
  const hoy12   = hoy.toISOString().split('T')[0]!

  const supabase = await createClient()

  const [{ data: aportesMesRaw }, { data: gastosMesRaw }, { data: aportesHistRaw }, { data: gastosHistRaw }] =
    await Promise.all([
      supabase.from('aportes')
        .select('monto, tipo, fecha, personas(nombre_completo)')
        .gte('fecha', desde).lte('fecha', hasta)
        .order('fecha', { ascending: false }),
      supabase.from('gastos')
        .select('monto, concepto, categoria, fecha')
        .gte('fecha', desde).lte('fecha', hasta)
        .order('fecha', { ascending: false }),
      supabase.from('aportes')
        .select('monto, tipo, fecha, personas(nombre_completo)')
        .gte('fecha', desde12).lte('fecha', hoy12)
        .order('fecha', { ascending: false }),
      supabase.from('gastos')
        .select('monto, concepto, categoria, fecha')
        .gte('fecha', desde12).lte('fecha', hoy12)
        .order('fecha', { ascending: false }),
    ])

  const aportesMes = (aportesMesRaw ?? []).map(a => ({
    monto: Number(a.monto),
    tipo:  a.tipo as string,
    fecha: a.fecha as string,
    persona: (a.personas as unknown as { nombre_completo: string } | null)?.nombre_completo ?? null,
  }))

  const gastosMes = (gastosMesRaw ?? []).map(g => ({
    monto:     Number(g.monto),
    concepto:  g.concepto as string,
    categoria: g.categoria as string,
    fecha:     g.fecha as string,
  }))

  const aportesHist = (aportesHistRaw ?? []).map(a => ({
    monto:  Number(a.monto),
    tipo:   a.tipo as string,
    fecha:  a.fecha as string,
    persona: (a.personas as unknown as { nombre_completo: string } | null)?.nombre_completo ?? null,
  }))

  const gastosHist = (gastosHistRaw ?? []).map(g => ({
    monto:     Number(g.monto),
    concepto:  g.concepto as string,
    categoria: g.categoria as string,
    fecha:     g.fecha as string,
  }))

  const totalAportes = aportesMes.reduce((s, a) => s + a.monto, 0)
  const totalGastos  = gastosMes.reduce((s, g) => s + g.monto, 0)
  const balance      = totalAportes - totalGastos

  // Navegación por mes
  const mesPrev  = mes === 1  ? 12 : mes - 1
  const anioPrev = mes === 1  ? anio - 1 : anio
  const mesSig   = mes === 12 ? 1  : mes + 1
  const anioSig  = mes === 12 ? anio + 1 : anio
  const esHoy    = mes === hoy.getMonth() + 1 && anio === hoy.getFullYear()

  return (
    <Pagina titulo="Finanzas" subtitulo="Aportes, gastos y actividades"
      acciones={<span className="flex gap-2">
        <BotonEnlace href="/finanzas/fondos" variante="tintado">Fondos</BotonEnlace>
        <BotonEnlace href="/finanzas/actividades" variante="tintado">Actividades</BotonEnlace>
      </span>}>
      <FinanzasTabs
        aportesMes={aportesMes}
        gastosMes={gastosMes}
        totalAportes={totalAportes}
        totalGastos={totalGastos}
        balance={balance}
        mes={mes}
        anio={anio}
        mesPrevHref={`/finanzas?mes=${mesPrev}&anio=${anioPrev}`}
        mesSigHref={esHoy ? null : `/finanzas?mes=${mesSig}&anio=${anioSig}`}
        mesPrevLabel={MESES[mesPrev - 1]!}
        mesSigLabel={MESES[mesSig - 1]!}
        mesLabel={`${MESES[mes - 1]} ${anio}`}
        aportesHist={aportesHist}
        gastosHist={gastosHist}
      />
    </Pagina>
  )
}
