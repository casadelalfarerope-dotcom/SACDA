'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp, Copy, Plus, Trash2, X } from 'lucide-react'
import { guardarExamen, type PreguntaEditable } from '@/app/actions/academia'
import Button from '@/components/ui/Button'

type Tipo = PreguntaEditable['tipo']
interface Pregunta extends PreguntaEditable { key: string }

const TIPOS: { value: Tipo; label: string }[] = [
  { value: 'opcion_unica', label: 'Opción única' },
  { value: 'opcion_multiple', label: 'Varias respuestas' },
  { value: 'verdadero_falso', label: 'Verdadero / Falso' },
  { value: 'respuesta_corta', label: 'Respuesta corta' },
  { value: 'parrafo', label: 'Párrafo (se califica a mano)' },
]

const nuevaKey = () => Math.random().toString(36).slice(2)
const VF = () => [{ texto: 'Verdadero', es_correcta: true }, { texto: 'Falso', es_correcta: false }]

function preguntaVacia(): Pregunta {
  return { key: nuevaKey(), tipo: 'opcion_unica', enunciado: '', puntos: 1, opciones: [{ texto: '', es_correcta: true }, { texto: '', es_correcta: false }] }
}

const campo = 'w-full px-3 py-2.5 rounded-xl text-sm outline-none border border-[color:var(--border)] focus:border-[color:var(--accent)]'
const estiloCampo = { background: 'var(--surface)', color: 'var(--foreground)' }

export default function ExamenEditor({ examenId, inicial, temas }: {
  examenId: string
  inicial: { titulo: string; descripcion: string; tema_id: string | null; preguntas: PreguntaEditable[] }
  temas: { id: string; label: string }[]
}) {
  const router = useRouter()
  const [titulo, setTitulo] = useState(inicial.titulo)
  const [descripcion, setDescripcion] = useState(inicial.descripcion)
  const [temaId, setTemaId] = useState(inicial.tema_id ?? '')
  const [preguntas, setPreguntas] = useState<Pregunta[]>(
    inicial.preguntas.length ? inicial.preguntas.map((p) => ({ ...p, key: nuevaKey() })) : [preguntaVacia()],
  )
  const [error, setError] = useState('')
  const [guardado, setGuardado] = useState(inicial.preguntas.length > 0)
  const [pending, startTransition] = useTransition()

  const total = preguntas.reduce((s, p) => s + (Number(p.puntos) || 0), 0)

  function actualizar(i: number, cambios: Partial<Pregunta>) {
    setGuardado(false)
    setPreguntas((ps) => ps.map((p, j) => (j === i ? { ...p, ...cambios } : p)))
  }

  function cambiarTipo(i: number, tipo: Tipo) {
    const p = preguntas[i]!
    let opciones = p.opciones
    if (tipo === 'verdadero_falso') opciones = VF()
    else if (tipo === 'parrafo') opciones = []
    else if (tipo === 'respuesta_corta') opciones = [{ texto: '', es_correcta: true }]
    else if (p.tipo === 'verdadero_falso' || p.tipo === 'parrafo' || p.tipo === 'respuesta_corta') {
      opciones = [{ texto: '', es_correcta: true }, { texto: '', es_correcta: false }]
    }
    if (tipo === 'opcion_unica' && opciones.filter((o) => o.es_correcta).length > 1) {
      let visto = false
      opciones = opciones.map((o) => { const c = o.es_correcta && !visto; if (c) visto = true; return { ...o, es_correcta: c } })
    }
    actualizar(i, { tipo, opciones })
  }

  function marcarCorrecta(i: number, j: number) {
    const p = preguntas[i]!
    const opciones = p.opciones.map((o, k) =>
      p.tipo === 'opcion_multiple' ? (k === j ? { ...o, es_correcta: !o.es_correcta } : o) : { ...o, es_correcta: k === j })
    actualizar(i, { opciones })
  }

  function mover(i: number, d: -1 | 1) {
    setGuardado(false)
    setPreguntas((ps) => {
      const n = [...ps]
      const j = i + d
      if (j < 0 || j >= n.length) return ps
      ;[n[i], n[j]] = [n[j]!, n[i]!]
      return n
    })
  }

  function guardar() {
    setError('')
    startTransition(async () => {
      const res = await guardarExamen(examenId, {
        titulo, descripcion, tema_id: temaId || null,
        preguntas: preguntas.map(({ key: _k, ...p }) => ({ ...p, puntos: Number(p.puntos) })),
      })
      if ('error' in res) { setError(res.error); return }
      setGuardado(true)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <div className="p-5 rounded-2xl border-t-4 border space-y-3" style={{ background: 'var(--surface)', borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}>
        <label htmlFor="ex-titulo" className="sr-only">Título del examen</label>
        <input id="ex-titulo" value={titulo} onChange={(e) => { setTitulo(e.target.value); setGuardado(false) }}
          className="w-full text-xl font-bold bg-transparent outline-none border-b pb-1 border-[color:var(--border)] focus:border-[color:var(--accent)]"
          style={{ color: 'var(--foreground)' }} placeholder="Título del examen" />
        <label htmlFor="ex-desc" className="sr-only">Instrucciones</label>
        <textarea id="ex-desc" value={descripcion} onChange={(e) => { setDescripcion(e.target.value); setGuardado(false) }}
          rows={2} placeholder="Instrucciones (opcional)" className={campo} style={estiloCampo} />
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="ex-tema" className="text-sm" style={{ color: 'var(--muted)' }}>Tema</label>
          <select id="ex-tema" value={temaId} onChange={(e) => { setTemaId(e.target.value); setGuardado(false) }}
            className={`${campo} w-auto flex-1`} style={estiloCampo}>
            <option value="">Examen general del curso</option>
            {temas.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Total: {total} pts</span>
        </div>
      </div>

      {preguntas.map((p, i) => (
        <fieldset key={p.key} className="p-5 rounded-2xl border space-y-3" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <legend className="sr-only">Pregunta {i + 1}</legend>
          <div className="flex items-start gap-2">
            <span className="text-sm font-semibold pt-2.5" style={{ color: 'var(--muted)' }} aria-hidden="true">{i + 1}.</span>
            <label htmlFor={`enun-${p.key}`} className="sr-only">Enunciado de la pregunta {i + 1}</label>
            <textarea id={`enun-${p.key}`} value={p.enunciado} rows={2} placeholder="Escribe la pregunta"
              onChange={(e) => actualizar(i, { enunciado: e.target.value })} className={campo} style={estiloCampo} />
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="sr-only" htmlFor={`tipo-${p.key}`}>Tipo de la pregunta {i + 1}</label>
            <select id={`tipo-${p.key}`} value={p.tipo} onChange={(e) => cambiarTipo(i, e.target.value as Tipo)}
              className={`${campo} w-auto flex-1 min-w-[12rem]`} style={estiloCampo}>
              {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <label htmlFor={`pts-${p.key}`} className="text-sm" style={{ color: 'var(--muted)' }}>Puntos</label>
              <input id={`pts-${p.key}`} type="number" min={0.5} step={0.5} value={p.puntos}
                onChange={(e) => actualizar(i, { puntos: e.target.value as unknown as number })}
                className={`${campo} w-20`} style={estiloCampo} />
            </div>
          </div>

          {p.tipo === 'parrafo' && (
            <p className="text-xs" style={{ color: 'var(--muted)' }}>El alumno escribe libremente; tú calificas esta pregunta después de que envíe el examen.</p>
          )}

          {p.tipo === 'respuesta_corta' && (
            <div className="space-y-2">
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Respuestas aceptadas (no importan mayúsculas ni tildes):</p>
              {p.opciones.map((o, j) => (
                <div key={j} className="flex items-center gap-2">
                  <label className="sr-only" htmlFor={`acep-${p.key}-${j}`}>Respuesta aceptada {j + 1}</label>
                  <input id={`acep-${p.key}-${j}`} value={o.texto} className={campo} style={estiloCampo}
                    onChange={(e) => actualizar(i, { opciones: p.opciones.map((x, k) => (k === j ? { ...x, texto: e.target.value } : x)) })} />
                  {p.opciones.length > 1 && (
                    <button type="button" aria-label={`Quitar respuesta aceptada ${j + 1}`} className="p-2 rounded-lg" style={{ color: 'var(--muted)' }}
                      onClick={() => actualizar(i, { opciones: p.opciones.filter((_, k) => k !== j) })}><X size={16} /></button>
                  )}
                </div>
              ))}
              <button type="button" className="text-sm font-medium" style={{ color: 'var(--accent)' }}
                onClick={() => actualizar(i, { opciones: [...p.opciones, { texto: '', es_correcta: true }] })}>+ Otra respuesta aceptada</button>
            </div>
          )}

          {(p.tipo === 'opcion_unica' || p.tipo === 'opcion_multiple' || p.tipo === 'verdadero_falso') && (
            <div className="space-y-2" role="group" aria-label={`Opciones de la pregunta ${i + 1}`}>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                Marca {p.tipo === 'opcion_multiple' ? 'todas las respuestas correctas' : 'la respuesta correcta'}:
              </p>
              {p.opciones.map((o, j) => (
                <div key={j} className="flex items-center gap-2">
                  <input type={p.tipo === 'opcion_multiple' ? 'checkbox' : 'radio'} name={`corr-${p.key}`}
                    checked={o.es_correcta} onChange={() => marcarCorrecta(i, j)} className="w-4 h-4 flex-shrink-0"
                    aria-label={`Marcar opción ${j + 1} como correcta`} />
                  <label className="sr-only" htmlFor={`op-${p.key}-${j}`}>Texto de la opción {j + 1}</label>
                  <input id={`op-${p.key}-${j}`} value={o.texto} disabled={p.tipo === 'verdadero_falso'}
                    placeholder={`Opción ${j + 1}`} className={campo} style={estiloCampo}
                    onChange={(e) => actualizar(i, { opciones: p.opciones.map((x, k) => (k === j ? { ...x, texto: e.target.value } : x)) })} />
                  {p.tipo !== 'verdadero_falso' && p.opciones.length > 2 && (
                    <button type="button" aria-label={`Quitar opción ${j + 1}`} className="p-2 rounded-lg" style={{ color: 'var(--muted)' }}
                      onClick={() => actualizar(i, { opciones: p.opciones.filter((_, k) => k !== j) })}><X size={16} /></button>
                  )}
                </div>
              ))}
              {p.tipo !== 'verdadero_falso' && (
                <button type="button" className="text-sm font-medium" style={{ color: 'var(--accent)' }}
                  onClick={() => actualizar(i, { opciones: [...p.opciones, { texto: '', es_correcta: false }] })}>+ Agregar opción</button>
              )}
            </div>
          )}

          <div className="flex justify-end gap-1 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <button type="button" aria-label={`Subir pregunta ${i + 1}`} disabled={i === 0} onClick={() => mover(i, -1)}
              className="p-2 rounded-lg disabled:opacity-30" style={{ color: 'var(--muted)' }}><ArrowUp size={16} /></button>
            <button type="button" aria-label={`Bajar pregunta ${i + 1}`} disabled={i === preguntas.length - 1} onClick={() => mover(i, 1)}
              className="p-2 rounded-lg disabled:opacity-30" style={{ color: 'var(--muted)' }}><ArrowDown size={16} /></button>
            <button type="button" aria-label={`Duplicar pregunta ${i + 1}`} className="p-2 rounded-lg" style={{ color: 'var(--muted)' }}
              onClick={() => { setGuardado(false); setPreguntas((ps) => [...ps.slice(0, i + 1), { ...p, key: nuevaKey(), opciones: p.opciones.map((o) => ({ ...o })) }, ...ps.slice(i + 1)]) }}>
              <Copy size={16} />
            </button>
            <button type="button" aria-label={`Eliminar pregunta ${i + 1}`} disabled={preguntas.length === 1} className="p-2 rounded-lg disabled:opacity-30"
              style={{ color: 'var(--error)' }} onClick={() => { setGuardado(false); setPreguntas((ps) => ps.filter((_, k) => k !== i)) }}>
              <Trash2 size={16} />
            </button>
          </div>
        </fieldset>
      ))}

      <Button type="button" variant="secondary" className="w-full" onClick={() => { setGuardado(false); setPreguntas((ps) => [...ps, preguntaVacia()]) }}>
        <Plus size={16} aria-hidden="true" /> Agregar pregunta
      </Button>

      <div className="sticky bottom-20 md:bottom-4 p-3 rounded-2xl border flex flex-wrap items-center gap-3 shadow-lg"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <Button type="button" onClick={guardar} loading={pending}>Guardar examen</Button>
        <span role="status" className="text-sm" style={{ color: error ? 'var(--error)' : guardado ? 'var(--success)' : 'var(--muted)' }}>
          {error || (guardado ? 'Cambios guardados.' : 'Hay cambios sin guardar.')}
        </span>
      </div>
    </div>
  )
}
