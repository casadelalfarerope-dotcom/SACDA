import { etiquetaMedio } from '@/lib/etiquetas'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { crearExcel, respuestaExcel } from '@/lib/excel'

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
    Medio: etiquetaMedio(a.medio),
    Fecha: a.fecha,
    Concepto: a.concepto ?? '',
  }))

  const buf = await crearExcel([{ nombre: 'Aportes', filas, anchos: [32, 12, 10, 10, 14, 12, 30],
    columnas: ['Nombre', 'DNI', 'Tipo', 'Monto', 'Medio', 'Fecha', 'Concepto'] }])
  const nombre = mes ? `aportes-${mes}.xlsx` : anio ? `aportes-${anio}.xlsx` : 'aportes.xlsx'
  return respuestaExcel(buf, nombre)
}
