import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { TrendingUp, TrendingDown, Plus, ArrowRight } from 'lucide-react'
import { formatDate } from '@/lib/utils'

function formatMonto(n: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n)
}

export default async function FinanzasPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; anio?: string }>
}) {
  const params = await searchParams
  const hoy = new Date()
  const mes = parseInt(params.mes ?? String(hoy.getMonth() + 1))
  const anio = parseInt(params.anio ?? String(hoy.getFullYear()))
  const mesStr = String(mes).padStart(2, '0')
  const desde = `${anio}-${mesStr}-01`
  const hasta = new Date(anio, mes, 0).toISOString().split('T')[0]!

  const supabase = await createClient()

  const [{ data: aportes }, { data: gastos }] = await Promise.all([
    supabase.from('aportes').select('monto, tipo, fecha, personas(nombre_completo)')
      .gte('fecha', desde).lte('fecha', hasta).order('fecha', { ascending: false }),
    supabase.from('gastos').select('monto, concepto, categoria, fecha')
      .gte('fecha', desde).lte('fecha', hasta).order('fecha', { ascending: false }),
  ])

  const totalAportes = (aportes ?? []).reduce((s, a) => s + Number(a.monto), 0)
  const totalGastos = (gastos ?? []).reduce((s, g) => s + Number(g.monto), 0)
  const balance = totalAportes - totalGastos

  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  const mesPrev = mes === 1 ? 12 : mes - 1
  const anioPrev = mes === 1 ? anio - 1 : anio
  const mesSig = mes === 12 ? 1 : mes + 1
  const anioSig = mes === 12 ? anio + 1 : anio

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Finanzas</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>Aportes y gastos</p>
        </div>
        <div className="flex gap-2">
          <Link href="/finanzas/actividades"
            className="px-3 py-2 rounded-xl text-sm font-medium border transition-opacity hover:opacity-70"
            style={{ borderColor: 'var(--border)', color: 'var(--foreground)', background: 'var(--surface)' }}>
            Actividades
          </Link>
        </div>
      </div>

      {/* Navegación por mes */}
      <div className="flex items-center justify-between mb-6 p-3 rounded-2xl border"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <Link href={`/finanzas?mes=${mesPrev}&anio=${anioPrev}`}
          className="px-3 py-1.5 rounded-xl text-sm hover:opacity-70 transition-opacity"
          style={{ color: 'var(--muted)' }}>
          &lt; {MESES[mesPrev - 1]}
        </Link>
        <span className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
          {MESES[mes - 1]} {anio}
        </span>
        {(mes !== hoy.getMonth() + 1 || anio !== hoy.getFullYear()) && (
          <Link href={`/finanzas?mes=${mesSig}&anio=${anioSig}`}
            className="px-3 py-1.5 rounded-xl text-sm hover:opacity-70 transition-opacity"
            style={{ color: 'var(--muted)' }}>
            {MESES[mesSig - 1]} &gt;
          </Link>
        )}
        {mes === hoy.getMonth() + 1 && anio === hoy.getFullYear() && (
          <span className="px-3 py-1.5 text-sm" style={{ color: 'var(--muted)', opacity: 0.3 }}>
            {MESES[mesSig - 1]} &gt;
          </span>
        )}
      </div>

      {/* Cards de resumen */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="p-4 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} style={{ color: '#16a34a' }} />
            <span className="text-xs" style={{ color: 'var(--muted)' }}>Aportes</span>
          </div>
          <p className="text-lg font-bold" style={{ color: '#16a34a' }}>{formatMonto(totalAportes)}</p>
        </div>
        <div className="p-4 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown size={14} style={{ color: 'var(--error)' }} />
            <span className="text-xs" style={{ color: 'var(--muted)' }}>Gastos</span>
          </div>
          <p className="text-lg font-bold" style={{ color: 'var(--error)' }}>{formatMonto(totalGastos)}</p>
        </div>
        <div className="p-4 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>Balance</p>
          <p className="text-lg font-bold" style={{ color: balance >= 0 ? '#16a34a' : 'var(--error)' }}>
            {formatMonto(balance)}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Aportes */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>Aportes ({(aportes ?? []).length})</p>
            <div className="flex gap-2">
              <Link href="/finanzas/aportes"
                className="text-xs flex items-center gap-1 hover:opacity-70"
                style={{ color: 'var(--accent)' }}>
                Ver todos <ArrowRight size={11} />
              </Link>
              <Link href="/finanzas/aportes/nuevo"
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-white"
                style={{ background: 'var(--accent)' }}>
                <Plus size={11} /> Nuevo
              </Link>
            </div>
          </div>
          <div className="space-y-2">
            {(aportes ?? []).slice(0, 8).map((a, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl border"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                    {(a.personas as any)?.nombre_completo ?? '—'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>
                    {a.tipo} · {formatDate(a.fecha)}
                  </p>
                </div>
                <p className="font-semibold text-sm" style={{ color: '#16a34a' }}>{formatMonto(Number(a.monto))}</p>
              </div>
            ))}
            {(aportes ?? []).length === 0 && (
              <p className="text-sm text-center py-4" style={{ color: 'var(--muted)' }}>Sin aportes este mes</p>
            )}
          </div>
        </div>

        {/* Gastos */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>Gastos ({(gastos ?? []).length})</p>
            <div className="flex gap-2">
              <Link href="/finanzas/gastos"
                className="text-xs flex items-center gap-1 hover:opacity-70"
                style={{ color: 'var(--accent)' }}>
                Ver todos <ArrowRight size={11} />
              </Link>
              <Link href="/finanzas/gastos/nuevo"
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-white"
                style={{ background: 'var(--accent)' }}>
                <Plus size={11} /> Nuevo
              </Link>
            </div>
          </div>
          <div className="space-y-2">
            {(gastos ?? []).slice(0, 8).map((g, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl border"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{g.concepto}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>
                    {g.categoria} · {formatDate(g.fecha)}
                  </p>
                </div>
                <p className="font-semibold text-sm" style={{ color: 'var(--error)' }}>{formatMonto(Number(g.monto))}</p>
              </div>
            ))}
            {(gastos ?? []).length === 0 && (
              <p className="text-sm text-center py-4" style={{ color: 'var(--muted)' }}>Sin gastos este mes</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
