'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { enviarIntento } from '@/app/actions/taller'
import Button from '@/components/ui/Button'

export interface PreguntaAlumno {
  id: string
  tipo: 'opcion_unica' | 'opcion_multiple' | 'verdadero_falso' | 'respuesta_corta' | 'parrafo'
  enunciado: string
  puntos: number
  opciones: { id: string; texto: string }[]
}

type Respuesta = { opciones: string[]; texto: string }

export default function RendirExamen({ examenId, intentoId, preguntas, tope }: {
  examenId: string; intentoId: string; preguntas: PreguntaAlumno[]; tope: number
}) {
  const [resp, setResp] = useState<Record<string, Respuesta>>({})
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState<{ estado: 'calificado' | 'en_revision'; nota: number | null } | null>(null)
  const [pending, startTransition] = useTransition()

  const r = (id: string): Respuesta => resp[id] ?? { opciones: [], texto: '' }
  const set = (id: string, v: Partial<Respuesta>) => setResp((p) => ({ ...p, [id]: { ...r(id), ...v } }))
  const sinResponder = preguntas.filter((p) => {
    const x = r(p.id)
    return p.tipo === 'respuesta_corta' || p.tipo === 'parrafo' ? !x.texto.trim() : !x.opciones.length
  }).length

  function enviar(e: React.FormEvent) {
    e.preventDefault()
    const aviso = sinResponder ? `Tienes ${sinResponder} pregunta(s) sin responder. ` : ''
    if (!window.confirm(`${aviso}¿Enviar tus respuestas? Ya no podrás cambiarlas.`)) return
    setError('')
    startTransition(async () => {
      const res = await enviarIntento(intentoId, preguntas.map((p) => ({ pregunta_id: p.id, opciones: r(p.id).opciones, texto: r(p.id).texto })))
      if ('error' in res) setError(res.error)
      else { setResultado({ estado: res.estado, nota: res.nota }); window.scrollTo({ top: 0, behavior: 'smooth' }) }
    })
  }

  if (resultado) {
    return (
      <div role="status" className="p-6 rounded-2xl border text-center space-y-3" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        {resultado.estado === 'calificado' ? (
          <>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Tu nota en este intento</p>
            <p className="text-5xl font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>{resultado.nota}<span className="text-xl" style={{ color: 'var(--muted)' }}>/20</span></p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>Nota máxima posible en este intento: {tope}/20</p>
          </>
        ) : (
          <p className="text-sm" style={{ color: 'var(--foreground)' }}>
            Enviado. Tu examen tiene preguntas abiertas: un líder las calificará y te avisaremos tu nota.
          </p>
        )}
        <Link href={`/taller/examenes/${examenId}`} className="inline-block text-sm font-medium underline" style={{ color: 'var(--accent)' }}>Volver al examen</Link>
      </div>
    )
  }

  const campo = 'w-full px-4 py-3 rounded-xl text-sm outline-none border border-[color:var(--border)] focus:border-[color:var(--accent)]'

  return (
    <form onSubmit={enviar} className="space-y-4">
      {preguntas.map((p, i) => (
        <fieldset key={p.id} className="p-5 rounded-2xl border space-y-3" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <legend className="sr-only">Pregunta {i + 1}</legend>
          <p className="text-sm font-medium whitespace-pre-line" style={{ color: 'var(--foreground)' }} id={`enun-${p.id}`}>
            {i + 1}. {p.enunciado}{' '}
            <span className="text-xs font-normal" style={{ color: 'var(--muted)' }}>({p.puntos} pt{p.puntos !== 1 ? 's' : ''})</span>
          </p>
          {p.tipo === 'opcion_multiple' && <p className="text-xs" style={{ color: 'var(--muted)' }}>Marca todas las correctas.</p>}

          {(p.tipo === 'opcion_unica' || p.tipo === 'verdadero_falso' || p.tipo === 'opcion_multiple') && (
            <div className="space-y-2" role={p.tipo === 'opcion_multiple' ? 'group' : 'radiogroup'} aria-labelledby={`enun-${p.id}`}>
              {p.opciones.map((o) => {
                const multiple = p.tipo === 'opcion_multiple'
                const marcado = r(p.id).opciones.includes(o.id)
                return (
                  <label key={o.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer text-sm"
                    style={{ borderColor: marcado ? 'var(--accent)' : 'var(--border)', color: 'var(--foreground)',
                      background: marcado ? 'color-mix(in srgb, var(--accent) 8%, var(--surface))' : 'transparent' }}>
                    <input type={multiple ? 'checkbox' : 'radio'} name={`p-${p.id}`} checked={marcado} className="w-4 h-4"
                      onChange={() => set(p.id, {
                        opciones: multiple ? (marcado ? r(p.id).opciones.filter((x) => x !== o.id) : [...r(p.id).opciones, o.id]) : [o.id],
                      })} />
                    {o.texto}
                  </label>
                )
              })}
            </div>
          )}

          {p.tipo === 'respuesta_corta' && (
            <input aria-labelledby={`enun-${p.id}`} value={r(p.id).texto} onChange={(e) => set(p.id, { texto: e.target.value })}
              className={campo} style={{ background: 'var(--surface)', color: 'var(--foreground)' }} placeholder="Tu respuesta" />
          )}
          {p.tipo === 'parrafo' && (
            <textarea aria-labelledby={`enun-${p.id}`} rows={5} value={r(p.id).texto} onChange={(e) => set(p.id, { texto: e.target.value })}
              className={campo} style={{ background: 'var(--surface)', color: 'var(--foreground)' }} placeholder="Tu respuesta" />
          )}
        </fieldset>
      ))}

      {error && <p role="alert" className="text-sm" style={{ color: 'var(--error)' }}>{error}</p>}
      <Button type="submit" size="lg" className="w-full" loading={pending}>Enviar examen</Button>
    </form>
  )
}
