import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Mic2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatDate, hoyLima } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import { IconoModulo } from '@/components/ui/IconoApp'
import { Pagina, Grupo, Fila, Tarjeta } from '@/components/ui/ios'
import { SoloEsteDia, TodaLaSerie } from '@/components/calendario/EditarEvento'

const RECURRENCIA: Record<string, string> = {
  ninguna: 'Evento de un solo día', semanal: 'Se repite cada semana', mensual_por_dia: 'Se repite cada mes', anual: 'Se repite cada año',
}
const DIA: Record<string, string> = { lunes: 'lunes', martes: 'martes', miercoles: 'miércoles', jueves: 'jueves', viernes: 'viernes', sabado: 'sábado', domingo: 'domingo' }
const ORDINAL: Record<number, string> = { 1: 'primer', 2: 'segundo', 3: 'tercer', 4: 'cuarto', 5: 'quinto', [-1]: 'último' }

// Un evento del calendario: cambios solo para un día (mover, cancelar, renombrar)
// o para toda la serie (nombre, hora, días, terminar, eliminar).
export default async function EventoPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ fecha?: string }> }) {
  const { id } = await params
  const { fecha } = await searchParams
  const supabase = await createClient()

  const { data: evento } = await supabase.from('eventos')
    .select('id, titulo, descripcion, tipo, hora_inicio, hora_fin, lugar, tipo_recurrencia, dias_semana, semana_del_mes, dia_semana_mes, fecha_unica, fecha_inicio_serie, fecha_fin_serie')
    .eq('id', id).maybeSingle()
  if (!evento) notFound()

  const esSerie = evento.tipo_recurrencia !== 'ninguna'
  const fechaOriginal = esSerie && fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : null
  const [{ data: excepcion }, { data: programa }, { data: puedeEditar }] = await Promise.all([
    fechaOriginal
      ? supabase.from('evento_excepciones').select('tipo_excepcion, fecha_nueva, hora_nueva_inicio, titulo_override').eq('evento_id', id).eq('fecha_original', fechaOriginal).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('programas').select('id, fecha, cancelado').eq('evento_id', id).eq('fecha_original', fechaOriginal ?? evento.fecha_unica ?? '').maybeSingle(),
    supabase.rpc('tiene_permiso', { p_modulo: 'calendario', p_accion: 'editar' }),
  ])

  const repeticion = evento.tipo_recurrencia === 'semanal'
    ? `Cada ${(evento.dias_semana ?? []).map((d: string) => DIA[d] ?? d).join(' y ')}`
    : evento.tipo_recurrencia === 'mensual_por_dia'
      ? `El ${ORDINAL[evento.semana_del_mes as number] ?? ''} ${DIA[evento.dia_semana_mes as string] ?? ''} de cada mes`
      : RECURRENCIA[evento.tipo_recurrencia]
  const hora = (h: string | null) => h ? h.slice(0, 5) : null
  const fechaDelDia = excepcion?.fecha_nueva ?? fechaOriginal

  return (
    <Pagina ancho="estrecho" titulo={excepcion?.titulo_override ?? evento.titulo} volver={{ href: '/calendario', texto: 'Calendario' }}
      subtitulo={[fechaDelDia ? formatDate(fechaDelDia) : evento.fecha_unica ? formatDate(evento.fecha_unica) : null,
        hora(excepcion?.hora_nueva_inicio ?? evento.hora_inicio), evento.lugar].filter(Boolean).join(' · ')}>

      <Grupo>
        <Fila primero titulo="Repetición" detalle={<span className="text-[14px]">{repeticion}</span>} />
        {evento.fecha_fin_serie && <Fila titulo="Termina" detalle={formatDate(evento.fecha_fin_serie)} />}
        {excepcion && (
          <Fila titulo="Este día" detalle={<Badge variant={excepcion.tipo_excepcion === 'cancelado' ? 'error' : 'warning'}>
            {excepcion.tipo_excepcion === 'cancelado' ? 'Cancelado' : excepcion.tipo_excepcion === 'reprogramado' ? `Movido desde el ${formatDate(fechaOriginal!)}` : 'Con cambios'}
          </Badge>} />
        )}
        {programa && (
          <Fila href={`/servidores/${programa.id}`} inicio={<IconoModulo icon={Mic2} color="#ff2d55" />} titulo="Programa de servidores"
            detalle={programa.cancelado ? <Badge variant="error">Cancelado</Badge> : undefined} />
        )}
      </Grupo>

      {!puedeEditar ? (
        <p className="text-[15px]" style={{ color: 'var(--muted)' }}>Solo Coordinación o un administrador pueden cambiar el calendario.</p>
      ) : (
        <>
          {fechaOriginal && (
            <Tarjeta titulo={`Solo el ${formatDate(fechaOriginal)}`}>
              <SoloEsteDia eventoId={id} fechaOriginal={fechaOriginal} horaActual={evento.hora_inicio} tituloActual={evento.titulo}
                excepcion={excepcion ? { tipo: excepcion.tipo_excepcion, fecha_nueva: excepcion.fecha_nueva, hora_nueva_inicio: excepcion.hora_nueva_inicio, titulo_override: excepcion.titulo_override } : null} />
            </Tarjeta>
          )}
          <Tarjeta titulo={esSerie ? 'Todos los días de la serie' : 'Editar evento'}>
            <TodaLaSerie evento={evento as Parameters<typeof TodaLaSerie>[0]['evento']} hoy={hoyLima()} />
          </Tarjeta>
          {esSerie && !fechaOriginal && (
            <p className="text-[13px]" style={{ color: 'var(--muted)' }}>
              Para mover o cancelar un solo día, ábrelo desde el <Link href="/calendario" className="underline" style={{ color: 'var(--accent)' }}>Calendario</Link>.
            </p>
          )}
        </>
      )}
    </Pagina>
  )
}
