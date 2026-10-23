import ExcelJS from 'exceljs'

export interface HojaExcel {
  nombre: string
  filas: Record<string, string | number>[]
  anchos?: number[]
  columnas?: string[] // encabezados en orden (si no hay filas, igual se escriben)
}

// Arma un .xlsx con una o más hojas: encabezado en negrita y fijo al desplazarse.
export async function crearExcel(hojas: HojaExcel[]): Promise<ArrayBuffer> {
  const libro = new ExcelJS.Workbook()
  libro.creator = 'Casa del Alfarero'
  for (const h of hojas) {
    const hoja = libro.addWorksheet(h.nombre.slice(0, 31))
    const columnas = h.columnas ?? Object.keys(h.filas[0] ?? {})
    hoja.columns = columnas.map((c, i) => ({ header: c, key: c, width: h.anchos?.[i] ?? 18 }))
    hoja.getRow(1).font = { bold: true }
    hoja.views = [{ state: 'frozen', ySplit: 1 }]
    for (const f of h.filas) hoja.addRow(f)
  }
  return (await libro.xlsx.writeBuffer()) as ArrayBuffer
}

export function respuestaExcel(buf: ArrayBuffer, nombre: string) {
  return new Response(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${nombre}"`,
    },
  })
}
