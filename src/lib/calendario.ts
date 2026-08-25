const DIAS: Record<string, number> = {
  lunes: 1, martes: 2, miercoles: 3, jueves: 4,
  viernes: 5, sabado: 6, domingo: 0,
}

export interface EventoBase {
  id: string
  titulo: string
  tipo: string
  hora_inicio: string | null
  hora_fin: string | null
  lugar: string | null
  tipo_recurrencia: string
  fecha_unica: string | null
  fecha_inicio_serie: string | null
  fecha_fin_serie: string | null
  dias_semana: string[] | null
  semana_del_mes: number | null
  dia_semana_mes: string | null
}

export interface ExcepcionBase {
  fecha_original: string
  tipo_excepcion: string
  fecha_nueva: string | null
  titulo_override: string | null
}

export interface Instancia {
  fecha: Date
  titulo: string
  hora_inicio: string | null
  lugar: string | null
  evento_id: string
  excepcion?: string
}

export function generarInstancias(
  evento: EventoBase,
  excepciones: ExcepcionBase[],
  desde: Date,
  hasta: Date
): Instancia[] {
  const instancias: Instancia[] = []
  const excMap = new Map(excepciones.map((e) => [e.fecha_original, e]))

  if (evento.tipo_recurrencia === 'ninguna' && evento.fecha_unica) {
    const fecha = new Date(evento.fecha_unica + 'T12:00:00')
    if (fecha >= desde && fecha <= hasta) {
      instancias.push({ fecha, titulo: evento.titulo, hora_inicio: evento.hora_inicio, lugar: evento.lugar, evento_id: evento.id })
    }
    return instancias
  }

  if (evento.tipo_recurrencia === 'semanal' && evento.dias_semana && evento.fecha_inicio_serie) {
    const diasNums = evento.dias_semana.map((d) => DIAS[d] ?? -1).filter((n) => n >= 0)
    const cursor = new Date(evento.fecha_inicio_serie + 'T12:00:00')
    if (cursor < desde) cursor.setTime(desde.getTime())

    while (cursor <= hasta) {
      if (diasNums.includes(cursor.getDay())) {
        const fechaStr = cursor.toISOString().split('T')[0]!
        const exc = excMap.get(fechaStr)
        if (!exc || exc.tipo_excepcion === 'modificado') {
          instancias.push({
            fecha: new Date(cursor),
            titulo: exc?.titulo_override ?? evento.titulo,
            hora_inicio: evento.hora_inicio,
            lugar: evento.lugar,
            evento_id: evento.id,
          })
        } else if (exc.tipo_excepcion === 'reprogramado' && exc.fecha_nueva) {
          const fechaNueva = new Date(exc.fecha_nueva + 'T12:00:00')
          if (fechaNueva >= desde && fechaNueva <= hasta) {
            instancias.push({
              fecha: fechaNueva,
              titulo: exc.titulo_override ?? evento.titulo,
              hora_inicio: evento.hora_inicio,
              lugar: evento.lugar,
              evento_id: evento.id,
              excepcion: 'reprogramado',
            })
          }
        }
      }
      cursor.setDate(cursor.getDate() + 1)
    }
    return instancias
  }

  if (evento.tipo_recurrencia === 'mensual_por_dia' && evento.semana_del_mes && evento.dia_semana_mes && evento.fecha_inicio_serie) {
    const diaNum = DIAS[evento.dia_semana_mes] ?? 0
    const inicio = new Date(evento.fecha_inicio_serie + 'T12:00:00')
    const mes = new Date(Math.max(desde.getTime(), inicio.getTime()))
    mes.setDate(1)

    while (mes <= hasta) {
      let count = 0
      let fecha: Date | null = null
      for (let d = 1; d <= 31; d++) {
        const candidato = new Date(mes.getFullYear(), mes.getMonth(), d)
        if (candidato.getMonth() !== mes.getMonth()) break
        if (candidato.getDay() === diaNum) {
          count++
          if (count === evento.semana_del_mes) { fecha = candidato; break }
        }
      }

      if (fecha && fecha >= desde && fecha <= hasta) {
        const fechaStr = fecha.toISOString().split('T')[0]!
        const exc = excMap.get(fechaStr)
        if (!exc || exc.tipo_excepcion === 'modificado') {
          instancias.push({ fecha, titulo: exc?.titulo_override ?? evento.titulo, hora_inicio: evento.hora_inicio, lugar: evento.lugar, evento_id: evento.id })
        } else if (exc.tipo_excepcion === 'reprogramado' && exc.fecha_nueva) {
          const fechaNueva = new Date(exc.fecha_nueva + 'T12:00:00')
          if (fechaNueva >= desde && fechaNueva <= hasta) {
            instancias.push({ fecha: fechaNueva, titulo: exc.titulo_override ?? evento.titulo, hora_inicio: evento.hora_inicio, lugar: evento.lugar, evento_id: evento.id, excepcion: 'reprogramado' })
          }
        }
      }
      mes.setMonth(mes.getMonth() + 1)
    }
  }

  return instancias.sort((a, b) => a.fecha.getTime() - b.fecha.getTime())
}
