import type { SupabaseClient } from '@supabase/supabase-js'

export interface MovimientoFondo {
  id: string
  origen: 'aporte' | 'gasto' | 'actividad' | 'movimiento'
  concepto: string
  detalle: string | null
  monto: number          // positivo = entra, negativo = sale
  fecha: string
  traspaso: boolean
  registradoPor: string | null // persona_id (solo movimientos sueltos)
  enlace: string | null
}

export interface SaldoFondo { entradas: number; salidas: number; saldo: number }

const vacio = (): SaldoFondo => ({ entradas: 0, salidas: 0, saldo: 0 })
function sumar(s: SaldoFondo, monto: number) {
  if (monto >= 0) s.entradas += monto; else s.salidas -= monto
  s.saldo += monto
}

// Saldo de cada fondo y del Fondo General (clave 'general'). Usa el cliente de
// servicio: quien llama ya verificó que la persona puede ver estos fondos.
export async function saldosFondos(admin: SupabaseClient): Promise<Map<string, SaldoFondo>> {
  const [{ data: aportes }, { data: gastos }, { data: acts }, { data: movs }] = await Promise.all([
    admin.from('aportes').select('monto, fondo_id'),
    admin.from('gastos').select('monto, fondo_id'),
    admin.from('actividades_financieras').select('fondo_id, movimientos:actividad_movimientos(tipo, monto)'),
    admin.from('fondo_movimientos').select('fondo_id, tipo, monto, traspaso'),
  ])
  const saldos = new Map<string, SaldoFondo>([['general', vacio()]])
  const de = (id: string | null) => {
    const k = id ?? 'general'
    if (!saldos.has(k)) saldos.set(k, vacio())
    return saldos.get(k)!
  }
  for (const a of aportes ?? []) sumar(de(a.fondo_id), Number(a.monto))
  for (const g of gastos ?? []) sumar(de(g.fondo_id), -Number(g.monto))
  for (const act of acts ?? []) {
    for (const m of (act.movimientos ?? []) as { tipo: string; monto: number }[]) {
      sumar(de(act.fondo_id), m.tipo === 'ingreso' ? Number(m.monto) : -Number(m.monto))
    }
  }
  for (const m of movs ?? []) {
    const monto = m.tipo === 'ingreso' ? Number(m.monto) : -Number(m.monto)
    sumar(de(m.fondo_id), monto)
    // Un traspaso de una sola fila tiene la otra punta en el Fondo General;
    // en uno entre dos fondos, las dos filas se anulan aquí.
    if (m.traspaso) sumar(de(null), -monto)
  }
  return saldos
}

// Todo lo que entró y salió de un fondo, del más reciente al más antiguo.
export async function movimientosDeFondo(admin: SupabaseClient, fondoId: string): Promise<MovimientoFondo[]> {
  const [{ data: aportes }, { data: gastos }, { data: acts }, { data: movs }] = await Promise.all([
    admin.from('aportes').select('id, monto, fecha, tipo, persona:personas(nombre_completo)').eq('fondo_id', fondoId),
    admin.from('gastos').select('id, monto, fecha, concepto').eq('fondo_id', fondoId),
    admin.from('actividades_financieras').select('id, nombre, fecha, movimientos:actividad_movimientos(tipo, monto)').eq('fondo_id', fondoId),
    admin.from('fondo_movimientos').select('id, tipo, concepto, monto, fecha, traspaso, registrado_por, persona:personas(nombre_completo)').eq('fondo_id', fondoId),
  ])
  const nombre = (p: unknown) => (p as { nombre_completo: string } | null)?.nombre_completo ?? null
  const lista: MovimientoFondo[] = [
    ...(aportes ?? []).map((a) => ({
      id: a.id, origen: 'aporte' as const, concepto: `Aporte · ${a.tipo}`, detalle: nombre(a.persona),
      monto: Number(a.monto), fecha: a.fecha, traspaso: false, registradoPor: null, enlace: null,
    })),
    ...(gastos ?? []).map((g) => ({
      id: g.id, origen: 'gasto' as const, concepto: g.concepto, detalle: 'Gasto registrado por Tesorería',
      monto: -Number(g.monto), fecha: g.fecha, traspaso: false, registradoPor: null, enlace: null,
    })),
    ...(acts ?? []).map((act) => {
      const ms = (act.movimientos ?? []) as { tipo: string; monto: number }[]
      const neto = ms.reduce((s, m) => s + (m.tipo === 'ingreso' ? Number(m.monto) : -Number(m.monto)), 0)
      return {
        id: act.id, origen: 'actividad' as const, concepto: act.nombre, detalle: 'Ganancia de la actividad',
        monto: neto, fecha: act.fecha, traspaso: false, registradoPor: null, enlace: `/finanzas/actividades/${act.id}`,
      }
    }),
    ...(movs ?? []).map((m) => ({
      id: m.id, origen: 'movimiento' as const, concepto: m.concepto,
      detalle: m.traspaso ? 'Traspaso' : nombre(m.persona),
      monto: m.tipo === 'ingreso' ? Number(m.monto) : -Number(m.monto), fecha: m.fecha, traspaso: m.traspaso,
      registradoPor: m.registrado_por, enlace: null,
    })),
  ]
  return lista.sort((a, b) => b.fecha.localeCompare(a.fecha))
}

export const soles = (n: number) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n)
