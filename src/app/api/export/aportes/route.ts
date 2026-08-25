import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const mes = searchParams.get('mes')    // YYYY-MM
  const anio = searchParams.get('anio')  // YYYY

  let query = supabase
    .from('aportes')
    .select('*, persona:personas(nombre_completo, dni)')
    .order('fecha', { ascending: false })

  if (mes) {
    query = query.gte('fecha', `${mes}-01`).lte('fecha', `${mes}-31`)
  } else if (anio) {
    query = query.gte('fecha', `${anio}-01-01`).lte('fecha', `${anio}-12-31`)
  }

  const { data: aportes } = await query
  if (!aportes) return NextResponse.json({ error: 'Sin datos' }, { status: 500 })

  const filas = aportes.map((a) => ({
    Nombre: (a.persona as { nombre_completo: string } | null)?.nombre_completo ?? '',
    DNI: (a.persona as { dni: string | null } | null)?.dni ?? '',
    Tipo: a.tipo,
    Monto: Number(a.monto),
    Fecha: a.fecha,
    Concepto: a.concepto ?? '',
  }))

  const ws = XLSX.utils.json_to_sheet(filas)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Aportes')

  // Ancho de columnas
  ws['!cols'] = [{ wch: 32 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 30 }]

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const nombre = mes ? `aportes-${mes}.xlsx` : anio ? `aportes-${anio}.xlsx` : 'aportes.xlsx'

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${nombre}"`,
    },
  })
}
