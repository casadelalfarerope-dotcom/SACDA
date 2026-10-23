'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X, Sparkles, Send, Undo2, Link as LinkIcon } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { agregarAsignacion, eliminarAsignacion, llenarSugerencias, publicarMinisterio, despublicarMinisterio } from '@/app/actions/servidores'

export interface PuestoPrograma {
  id: string
  nombre: string
  cantidad: number
  modo: 'fijo' | 'rotativo'
  requiere_material: boolean
  asignados: { id: string; persona_id: string; nombre: string; material_url: string | null }[]
}

// Parte de un ministerio dentro del programa de un culto: puestos, quién
// sirve en cada uno, sugerencia automática y publicación.
export default function ParteMinisterio({ programaId, grupo, estado, puestos, integrantes, puedeEditar }: {
  programaId: string
  grupo: { id: string; nombre: string }
  estado: 'vacio' | 'borrador' | 'publicado'
  puestos: PuestoPrograma[]
  integrantes: { id: string; nombre: string }[]
  puedeEditar: boolean
}) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  function ejecutar(accion: () => Promise<{ error?: string; success?: boolean; cantidad?: number }>, ok?: string) {
    setMensaje(null)
    iniciar(async () => {
      const res = await accion()
      if (res.error) setMensaje({ tipo: 'error', texto: res.error })
      else if (ok) setMensaje({ tipo: 'ok', texto: ok })
      router.refresh()
    })
  }

  const asignados = puestos.reduce((n, p) => n + p.asignados.length, 0)
  const necesarios = puestos.reduce((n, p) => n + p.cantidad, 0)
  const completo = asignados >= necesarios

  return (
    <section className="space-y-1.5" aria-label={`Ministerio ${grupo.nombre}`}>
      <div className="flex flex-wrap items-end justify-between gap-2 px-4">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
          {grupo.nombre} · {asignados}/{necesarios}
        </h2>
        {estado === 'publicado'
          ? <Badge variant="success">Publicado</Badge>
          : <Badge variant={estado === 'vacio' ? 'muted' : 'warning'}>{estado === 'vacio' ? 'Sin llenar' : 'Borrador'}</Badge>}
      </div>

      <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <ul>
          {puestos.map((p, i) => {
            const libres = integrantes.filter((m) => !p.asignados.some((a) => a.persona_id === m.id))
            return (
              <li key={p.id} className={i ? 'border-t' : ''} style={{ borderColor: 'var(--border)' }}>
                <div className="px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[15px] font-medium" style={{ color: 'var(--foreground)' }}>
                      {p.nombre}
                      <span className="ml-2 text-[13px] font-normal" style={{ color: 'var(--muted)' }}>
                        {p.asignados.length}/{p.cantidad} · {p.modo === 'fijo' ? 'fijo' : 'rota'}
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {p.asignados.map((a) => (
                      <span key={a.id} className="inline-flex items-center gap-1 h-8 pl-3 pr-1 rounded-full text-[14px]"
                        style={{ background: 'var(--fill)', color: 'var(--foreground)' }}>
                        {a.nombre}
                        {p.requiere_material && a.material_url && (
                          <a href={a.material_url} target="_blank" rel="noopener noreferrer" aria-label={`Material de ${a.nombre}`}
                            className="p-1" style={{ color: 'var(--accent)' }}><LinkIcon size={13} /></a>
                        )}
                        {puedeEditar && (
                          <button type="button" aria-label={`Quitar a ${a.nombre} de ${p.nombre}`} disabled={pendiente}
                            onClick={() => ejecutar(() => eliminarAsignacion(a.id, programaId))}
                            className="w-6 h-6 inline-flex items-center justify-center rounded-full hover:opacity-70" style={{ color: 'var(--muted)' }}>
                            <X size={14} />
                          </button>
                        )}
                      </span>
                    ))}
                    {!p.asignados.length && !puedeEditar && <span className="text-[14px]" style={{ color: 'var(--muted)' }}>Sin asignar</span>}
                    {puedeEditar && libres.length > 0 && (
                      <select aria-label={`Agregar persona a ${p.nombre}`} value="" disabled={pendiente}
                        onChange={(e) => e.target.value && ejecutar(() => agregarAsignacion({ programa_id: programaId, rol_servicio_id: p.id, persona_id: e.target.value }))}
                        className="h-8 px-2.5 rounded-full text-[14px] outline-none border border-transparent"
                        style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)' }}>
                        <option value="">+ Agregar</option>
                        {libres.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                      </select>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
          {!puestos.length && (
            <li className="px-4 py-3 text-[15px]" style={{ color: 'var(--muted)' }}>Este ministerio aún no tiene puestos definidos.</li>
          )}
        </ul>
      </div>

      {puedeEditar && puestos.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-1 pt-1">
          {!completo && (
            <Button size="sm" variant="secondary" loading={pendiente} onClick={() => ejecutar(() => llenarSugerencias(programaId, grupo.id), 'Se completaron los puestos vacíos. Revisa y publica.')}>
              <Sparkles size={14} aria-hidden="true" /> Completar con sugerencia
            </Button>
          )}
          {estado !== 'publicado' ? (
            <Button size="sm" loading={pendiente} disabled={!asignados} onClick={() => ejecutar(() => publicarMinisterio(programaId, grupo.id), 'Publicado. Ya les avisamos a los asignados.')}>
              <Send size={14} aria-hidden="true" /> Publicar
            </Button>
          ) : (
            <Button size="sm" variant="ghost" loading={pendiente} onClick={() => ejecutar(() => despublicarMinisterio(programaId, grupo.id))}>
              <Undo2 size={14} aria-hidden="true" /> Volver a borrador
            </Button>
          )}
        </div>
      )}
      {mensaje && (
        <p role={mensaje.tipo === 'error' ? 'alert' : 'status'} className="px-4 text-[13px]"
          style={{ color: mensaje.tipo === 'error' ? 'var(--error)' : 'var(--success)' }}>{mensaje.texto}</p>
      )}
    </section>
  )
}
