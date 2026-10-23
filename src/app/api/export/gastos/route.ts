import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { crearExcel, respuestaExcel } from '@/lib/excel'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const mes = searchParams.get('mes')
  const anio = searchParams.get('anio')

  let query = supabase
    .from('gastos')
    .select('*')
    .order('fecha', { ascending: false })

  if (mes) {
    query = query.gte('fecha', `${mes}-01`).lte('fecha', `${mes}-31`)
  } else if (anio) {
    query = query.gte('fecha', `${anio}-01-01`).lte('fecha', `${anio}-12-31`)
  }

  const { data: gastos } = await query
  if (!gastos) return NextResponse.json({ error: 'Sin datos' }, { status: 500 })

  const filas = gastos.map((g) => ({
    Concepto: g.concepto,
    Monto: Number(g.monto),
    Fecha: g.fecha,
    Categoría: g.categoria,
    Descripción: g.descripcion ?? '',
  }))

  const buf = await crearExcel([{ nombre: 'Gastos', filas, anchos: [30, 10, 12, 15, 40],
    columnas: ['Concepto', 'Monto', 'Fecha', 'Categoría', 'Descripción'] }])
  const nombre = mes ? `gastos-${mes}.xlsx` : anio ? `gastos-${anio}.xlsx` : 'gastos.xlsx'
  return respuestaExcel(buf, nombre)
}
