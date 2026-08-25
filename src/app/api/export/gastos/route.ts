import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

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

  const ws = XLSX.utils.json_to_sheet(filas)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Gastos')
  ws['!cols'] = [{ wch: 30 }, { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 40 }]

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const nombre = mes ? `gastos-${mes}.xlsx` : anio ? `gastos-${anio}.xlsx` : 'gastos.xlsx'

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${nombre}"`,
    },
  })
}
