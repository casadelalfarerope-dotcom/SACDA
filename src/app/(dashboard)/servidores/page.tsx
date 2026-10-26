import { CalendarDays, Mic2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { asegurarProgramas } from '@/lib/programas'
import { formatDate, hoyLima } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import { IconoModulo } from '@/components/ui/IconoApp'
import { Pagina, Grupo, Fila, BotonEnlace, Vacio } from '@/components/ui/ios'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export default async function ServidoresPage() {
  // Los programas salen solos del calendario (próximos 3 meses).
  await asegurarProgramas(createServiceClient())

  const supabase = await createClient()
  const hoy = hoyLima()
  const [{ data: programas }, { data: ministerios }] = await Promise.all([
    supabase.from('programas').select('id, titulo, fecha, hora_inicio, cancelado, programa_ministerios(estado)')
      .gte('fecha', hoy).is('grupo_id', null).order('fecha').order('hora_inicio'),
    // Ministerios que tienen puestos en el culto.
    supabase.from('roles_servicio').select('grupo_id').eq('activo', true).not('grupo_id', 'is', null).is('evento_id', null),
  ])
  const totalMinisterios = new Set((ministerios ?? []).map((m) => m.grupo_id)).size

  const porMes = new Map<string, NonNullable<typeof programas>>()
  for (const p of programas ?? []) {
    const k = p.fecha.slice(0, 7)
    if (!porMes.has(k)) porMes.set(k, [])
    porMes.get(k)!.push(p)
  }

  return (
    <Pagina titulo="Servidores" subtitulo="Programación de los cultos de los próximos 3 meses"
      acciones={<BotonEnlace href="/calendario" variante="tintado"><CalendarDays size={15} aria-hidden="true" /> Cultos en el calendario</BotonEnlace>}>
      <p className="text-[15px]" style={{ color: 'var(--muted)' }}>
        Cada culto del calendario tiene su programa. El líder de cada ministerio llena y publica su parte; aquí ves el avance de todos.
      </p>

      {!programas?.length && (
        <Vacio icono={<Mic2 size={44} />} titulo="No hay cultos programados" texto="Agrega los cultos (viernes, domingo…) como eventos de tipo Servicio en el Calendario." />
      )}

      {[...porMes.entries()].map(([mes, lista]) => (
        <Grupo key={mes} titulo={`${MESES[Number(mes.slice(5, 7)) - 1]} ${mes.slice(0, 4)}`}>
          {lista.map((p, i) => {
            const publicados = ((p.programa_ministerios ?? []) as { estado: string }[]).filter((m) => m.estado === 'publicado').length
            return (
              <Fila key={p.id} href={`/servidores/${p.id}`} primero={i === 0}
                inicio={<IconoModulo icon={Mic2} color={p.cancelado ? '#8e8e93' : '#ff2d55'} tamano={36} />}
                titulo={p.titulo}
                subtitulo={`${formatDate(p.fecha)}${p.hora_inicio ? ` · ${p.hora_inicio.slice(0, 5)}` : ''}`}
                detalle={p.cancelado
                  ? <Badge variant="error">Cancelado</Badge>
                  : <Badge variant={totalMinisterios && publicados >= totalMinisterios ? 'success' : publicados ? 'info' : 'muted'}>
                      {publicados}/{totalMinisterios} publicados
                    </Badge>} />
            )
          })}
        </Grupo>
      ))}
    </Pagina>
  )
}
