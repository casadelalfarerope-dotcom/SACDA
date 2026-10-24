'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarClock, Ban, Pencil, Undo2, Trash2 } from 'lucide-react'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import { Segmentado } from '@/components/ui/ios'
import { crearExcepcion, eliminarExcepcion, editarEvento, terminarSerie, eliminarEvento } from '@/app/actions/calendario'

type Resultado = { error?: string; success?: boolean }

function useAccion() {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const ejecutar = (accion: () => Promise<Resultado>, ok: string, despues?: () => void) => {
    setMensaje(null)
    iniciar(async () => {
      const res = await accion()
      if (res.error) { setMensaje({ tipo: 'error', texto: res.error }); return }
      setMensaje({ tipo: 'ok', texto: ok })
      despues?.()
      router.refresh()
    })
  }
  return { pendiente, mensaje, ejecutar }
}

function Mensaje({ m }: { m: { tipo: 'ok' | 'error'; texto: string } | null }) {
  if (!m) return null
  return <p role={m.tipo === 'error' ? 'alert' : 'status'} className="text-[13px]" style={{ color: m.tipo === 'error' ? 'var(--error)' : 'var(--success)' }}>{m.texto}</p>
}

type Opcion = 'mover' | 'cancelar' | 'renombrar'

// Cambios que afectan solo a un día de la serie (excepciones).
export function SoloEsteDia({ eventoId, fechaOriginal, horaActual, tituloActual, excepcion }: {
  eventoId: string
  fechaOriginal: string
  horaActual: string | null
  tituloActual: string
  excepcion: { tipo: string; fecha_nueva: string | null; hora_nueva_inicio: string | null; titulo_override: string | null } | null
}) {
  const { pendiente, mensaje, ejecutar } = useAccion()
  const [opcion, setOpcion] = useState<Opcion>('mover')
  const [fecha, setFecha] = useState(excepcion?.fecha_nueva ?? fechaOriginal)
  const [hora, setHora] = useState((excepcion?.hora_nueva_inicio ?? horaActual ?? '').slice(0, 5))
  const [titulo, setTitulo] = useState(excepcion?.titulo_override ?? tituloActual)

  return (
    <div className="space-y-4">
      {excepcion && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl p-3" style={{ background: 'var(--fill)' }}>
          <p className="text-[14px]" style={{ color: 'var(--foreground)' }}>
            {excepcion.tipo === 'cancelado' ? 'Este día está cancelado.' : excepcion.tipo === 'reprogramado' ? 'Este día fue movido.' : 'Este día tiene cambios.'}
          </p>
          <Button size="sm" variant="secondary" loading={pendiente}
            onClick={() => ejecutar(() => eliminarExcepcion(eventoId, fechaOriginal), 'Listo: este día volvió a lo normal.')}>
            <Undo2 size={14} aria-hidden="true" /> Volver a lo normal
          </Button>
        </div>
      )}

      <Segmentado etiqueta="Qué cambiar" valor={opcion} onChange={setOpcion} ancho opciones={[
        { valor: 'mover', texto: 'Mover' }, { valor: 'cancelar', texto: 'Cancelar' }, { valor: 'renombrar', texto: 'Cambiar nombre' },
      ]} />

      {opcion === 'mover' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nueva fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            <Input label="Nueva hora" type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
          </div>
          <p className="text-[13px]" style={{ color: 'var(--muted)' }}>El programa de servidores de este culto se mueve con él; las asignaciones se conservan.</p>
          <Button loading={pendiente} onClick={() => ejecutar(() => crearExcepcion({
            evento_id: eventoId, fecha_original: fechaOriginal, tipo_excepcion: 'reprogramado',
            fecha_nueva: fecha, hora_nueva_inicio: hora || undefined, titulo_override: excepcion?.titulo_override ?? undefined,
          }), 'Listo: el culto se movió.')}>
            <CalendarClock size={16} aria-hidden="true" /> Mover este día
          </Button>
        </div>
      )}

      {opcion === 'cancelar' && (
        <div className="space-y-3">
          <p className="text-[14px]" style={{ color: 'var(--foreground)' }}>
            Solo se cancela este día; los demás siguen igual. Si nadie fue asignado a su programa de servidores, se elimina; si no, queda marcado como cancelado.
          </p>
          <Button variant="destructive" loading={pendiente} onClick={() => {
            if (!confirm('¿Cancelar solo este día?')) return
            ejecutar(() => crearExcepcion({ evento_id: eventoId, fecha_original: fechaOriginal, tipo_excepcion: 'cancelado' }), 'Listo: este día quedó cancelado.')
          }}>
            <Ban size={16} aria-hidden="true" /> Cancelar este día
          </Button>
        </div>
      )}

      {opcion === 'renombrar' && (
        <div className="space-y-3">
          <Input label="Nombre para este día" value={titulo} maxLength={120} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej. Culto especial de aniversario" />
          <Button loading={pendiente} onClick={() => ejecutar(() => crearExcepcion({
            evento_id: eventoId, fecha_original: fechaOriginal,
            tipo_excepcion: excepcion?.tipo === 'reprogramado' ? 'reprogramado' : 'modificado',
            fecha_nueva: excepcion?.fecha_nueva ?? undefined, hora_nueva_inicio: excepcion?.hora_nueva_inicio ?? undefined, titulo_override: titulo,
          }), 'Listo: se cambió el nombre de este día.')}>
            <Pencil size={16} aria-hidden="true" /> Guardar nombre
          </Button>
        </div>
      )}
      <Mensaje m={mensaje} />
    </div>
  )
}

const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
const DIA_LABEL: Record<string, string> = { lunes: 'Lun', martes: 'Mar', miercoles: 'Mié', jueves: 'Jue', viernes: 'Vie', sabado: 'Sáb', domingo: 'Dom' }

// Edición de la serie completa (o del evento único).
export function TodaLaSerie({ evento, hoy }: {
  evento: {
    id: string; titulo: string; descripcion: string | null; tipo: 'servicio' | 'actividad_especial' | 'evento_unico'
    hora_inicio: string | null; hora_fin: string | null; lugar: string | null
    tipo_recurrencia: string; dias_semana: string[] | null; fecha_unica: string | null; fecha_fin_serie: string | null
  }
  hoy: string
}) {
  const router = useRouter()
  const { pendiente, mensaje, ejecutar } = useAccion()
  const [f, setF] = useState({
    titulo: evento.titulo, descripcion: evento.descripcion ?? '', tipo: evento.tipo,
    hora_inicio: evento.hora_inicio?.slice(0, 5) ?? '', hora_fin: evento.hora_fin?.slice(0, 5) ?? '', lugar: evento.lugar ?? '',
    dias_semana: evento.dias_semana ?? [], fecha_unica: evento.fecha_unica ?? '',
  })
  const [fin, setFin] = useState(evento.fecha_fin_serie ?? '')
  const esSerie = evento.tipo_recurrencia !== 'ninguna'

  return (
    <div className="space-y-5">
      <form className="space-y-3" noValidate onSubmit={(e) => {
        e.preventDefault()
        ejecutar(() => editarEvento(evento.id, { ...f, tipo: f.tipo }), esSerie ? 'Listo: se actualizaron todos los días.' : 'Listo: se actualizó el evento.')
      }}>
        <Input label="Nombre *" value={f.titulo} maxLength={120} onChange={(e) => setF({ ...f, titulo: e.target.value })} />
        <Select label="Tipo" value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value as typeof f.tipo })} options={[
          { value: 'servicio', label: 'Servicio / Culto (tiene programa de servidores)' },
          { value: 'actividad_especial', label: 'Actividad especial' },
          { value: 'evento_unico', label: 'Evento' },
        ]} />
        {evento.tipo_recurrencia === 'semanal' && (
          <fieldset className="space-y-1.5">
            <legend className="text-[13px] font-medium" style={{ color: 'var(--muted)' }}>Se repite los días</legend>
            <div className="flex flex-wrap gap-1.5">
              {DIAS.map((d) => {
                const sel = f.dias_semana.includes(d)
                return (
                  <button key={d} type="button" aria-pressed={sel}
                    onClick={() => setF({ ...f, dias_semana: sel ? f.dias_semana.filter((x) => x !== d) : [...f.dias_semana, d] })}
                    className="h-9 px-3 rounded-full text-[14px] font-semibold"
                    style={{ background: sel ? 'var(--accent)' : 'var(--fill)', color: sel ? 'var(--accent-foreground)' : 'var(--foreground)' }}>
                    {DIA_LABEL[d]}
                  </button>
                )
              })}
            </div>
          </fieldset>
        )}
        {evento.tipo_recurrencia === 'ninguna' && (
          <Input label="Fecha *" type="date" value={f.fecha_unica} onChange={(e) => setF({ ...f, fecha_unica: e.target.value })} />
        )}
        <div className="grid grid-cols-2 gap-3">
          <Input label="Hora de inicio" type="time" value={f.hora_inicio} onChange={(e) => setF({ ...f, hora_inicio: e.target.value })} />
          <Input label="Hora de fin" type="time" value={f.hora_fin} onChange={(e) => setF({ ...f, hora_fin: e.target.value })} />
        </div>
        <Input label="Lugar" value={f.lugar} onChange={(e) => setF({ ...f, lugar: e.target.value })} placeholder="Ej. Templo principal" />
        <Button type="submit" loading={pendiente}>Guardar cambios{esSerie ? ' de la serie' : ''}</Button>
      </form>

      {esSerie && (
        <div className="space-y-3 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <p className="text-[15px] font-semibold" style={{ color: 'var(--foreground)' }}>Terminar la serie</p>
          <p className="text-[13px]" style={{ color: 'var(--muted)' }}>La serie deja de repetirse después de esta fecha. Los días anteriores se conservan.</p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[10rem]"><Input label="Último día" type="date" min={hoy} value={fin} onChange={(e) => setFin(e.target.value)} /></div>
            <Button variant="secondary" loading={pendiente} disabled={!fin}
              onClick={() => ejecutar(() => terminarSerie(evento.id, fin), 'Listo: la serie termina en esa fecha.')}>Terminar ahí</Button>
          </div>
        </div>
      )}

      <div className="space-y-2 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <Button variant="destructive" loading={pendiente} onClick={() => {
          if (!confirm(esSerie ? '¿Eliminar este evento y todos sus días? Sus programas de servidores futuros también se eliminarán.' : '¿Eliminar este evento?')) return
          ejecutar(() => eliminarEvento(evento.id), 'Evento eliminado.', () => router.push('/calendario'))
        }}>
          <Trash2 size={16} aria-hidden="true" /> Eliminar evento{esSerie ? ' (todos los días)' : ''}
        </Button>
      </div>
      <Mensaje m={mensaje} />
    </div>
  )
}
