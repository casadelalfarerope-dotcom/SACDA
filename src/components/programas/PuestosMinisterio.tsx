'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronUp, ChevronDown, Trash2, Users } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Segmentado } from '@/components/ui/ios'
import { crearPuesto, actualizarPuesto, eliminarPuesto, guardarCandidatos } from '@/app/actions/servidores'

export interface PuestoEditable {
  id: string
  nombre: string
  cantidad: number
  modo: 'fijo' | 'rotativo'
  requiere_material: boolean
  candidatos: string[] // persona_id en orden de rotación
}

type Modo = 'fijo' | 'rotativo'
const MODOS: { valor: Modo; texto: string }[] = [{ valor: 'rotativo', texto: 'Rota' }, { valor: 'fijo', texto: 'Fijo' }]

// Puestos que el ministerio cubre en cada culto (Predicación, Sonido…).
export default function PuestosMinisterio({ grupoId, puestos, integrantes }: {
  grupoId: string
  puestos: PuestoEditable[]
  integrantes: { id: string; nombre: string }[]
}) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [error, setError] = useState('')
  const [abierto, setAbierto] = useState<string | null>(null)
  const [nuevo, setNuevo] = useState({ nombre: '', cantidad: 1, modo: 'rotativo' as Modo, requiere_material: false })

  function ejecutar(accion: () => Promise<{ error?: string }>, despues?: () => void) {
    setError('')
    iniciar(async () => {
      const res = await accion()
      if (res.error) setError(res.error)
      else despues?.()
      router.refresh()
    })
  }

  const nombre = (id: string) => integrantes.find((m) => m.id === id)?.nombre ?? '—'

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <ul>
          {puestos.map((p, i) => (
            <li key={p.id} className={i ? 'border-t' : ''} style={{ borderColor: 'var(--border)' }}>
              <div className="px-4 py-3 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[15px] font-medium" style={{ color: 'var(--foreground)' }}>{p.nombre}</p>
                    <p className="text-[13px]" style={{ color: 'var(--muted)' }}>
                      {p.candidatos.length ? `Pueden hacerlo: ${p.candidatos.map(nombre).join(', ')}` : 'Puede hacerlo cualquier integrante'}
                    </p>
                  </div>
                  <button type="button" aria-label={`Eliminar el puesto ${p.nombre}`} disabled={pendiente}
                    onClick={() => confirm(`¿Eliminar el puesto "${p.nombre}"?`) && ejecutar(() => eliminarPuesto(p.id, grupoId))}
                    className="p-2 -m-1 rounded-lg hover:opacity-70" style={{ color: 'var(--destructive)' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Segmentado etiqueta={`Modo de ${p.nombre}`} opciones={MODOS} valor={p.modo}
                    onChange={(modo) => ejecutar(() => actualizarPuesto(p.id, grupoId, { modo }))} />
                  <label className="inline-flex items-center gap-2 text-[14px]" style={{ color: 'var(--foreground)' }}>
                    Personas
                    <select value={p.cantidad} disabled={pendiente} aria-label={`Personas para ${p.nombre}`}
                      onChange={(e) => ejecutar(() => actualizarPuesto(p.id, grupoId, { cantidad: Number(e.target.value) }))}
                      className="h-8 px-2 rounded-[8px] text-[14px] outline-none border border-transparent"
                      style={{ background: 'var(--fill)', color: 'var(--foreground)' }}>
                      {Array.from({ length: 10 }, (_, n) => n + 1).map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
                  <label className="inline-flex items-center gap-2 text-[14px]" style={{ color: 'var(--foreground)' }}>
                    <input type="checkbox" checked={p.requiere_material} disabled={pendiente}
                      onChange={(e) => ejecutar(() => actualizarPuesto(p.id, grupoId, { requiere_material: e.target.checked }))} />
                    Pide material
                  </label>
                  <Button size="sm" variant="ghost" onClick={() => setAbierto(abierto === p.id ? null : p.id)} aria-expanded={abierto === p.id}>
                    <Users size={14} aria-hidden="true" /> Quiénes
                  </Button>
                </div>
                {abierto === p.id && (
                  <Candidatos inicial={p.candidatos} integrantes={integrantes} pendiente={pendiente}
                    onGuardar={(ids) => ejecutar(() => guardarCandidatos(p.id, grupoId, ids), () => setAbierto(null))} />
                )}
              </div>
            </li>
          ))}
          {!puestos.length && <li className="px-4 py-3 text-[15px]" style={{ color: 'var(--muted)' }}>Aún no hay puestos.</li>}
        </ul>
      </div>

      <form className="rounded-2xl border p-4 space-y-3" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        onSubmit={(e) => {
          e.preventDefault()
          ejecutar(() => crearPuesto(grupoId, nuevo), () => setNuevo({ nombre: '', cantidad: 1, modo: 'rotativo', requiere_material: false }))
        }}>
        <p className="text-[15px] font-semibold" style={{ color: 'var(--foreground)' }}>Agregar puesto</p>
        <Input label="Nombre" placeholder="Ej. Palabra de ofrenda" maxLength={60} value={nuevo.nombre}
          onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} />
        <div className="flex flex-wrap items-center gap-3">
          <Segmentado etiqueta="Modo del nuevo puesto" opciones={MODOS} valor={nuevo.modo} onChange={(modo) => setNuevo({ ...nuevo, modo })} />
          <label className="inline-flex items-center gap-2 text-[14px]" style={{ color: 'var(--foreground)' }}>
            Personas
            <select value={nuevo.cantidad} onChange={(e) => setNuevo({ ...nuevo, cantidad: Number(e.target.value) })}
              className="h-8 px-2 rounded-[8px] text-[14px] outline-none border border-transparent" style={{ background: 'var(--fill)', color: 'var(--foreground)' }}>
              {Array.from({ length: 10 }, (_, n) => n + 1).map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label className="inline-flex items-center gap-2 text-[14px]" style={{ color: 'var(--foreground)' }}>
            <input type="checkbox" checked={nuevo.requiere_material} onChange={(e) => setNuevo({ ...nuevo, requiere_material: e.target.checked })} />
            Pide material
          </label>
        </div>
        <p className="text-[13px]" style={{ color: 'var(--muted)' }}>
          <b>Rota</b>: el sistema sugiere al siguiente de la lista en cada culto. <b>Fijo</b>: sugiere a los mismos del culto anterior.
        </p>
        <Button type="submit" size="sm" loading={pendiente}>Agregar puesto</Button>
      </form>
      {error && <p role="alert" className="text-[13px] px-1" style={{ color: 'var(--error)' }}>{error}</p>}
    </div>
  )
}

// Lista ordenada de quiénes pueden ocupar el puesto (el orden es el de la rotación).
function Candidatos({ inicial, integrantes, pendiente, onGuardar }: {
  inicial: string[]; integrantes: { id: string; nombre: string }[]; pendiente: boolean; onGuardar: (ids: string[]) => void
}) {
  const [ids, setIds] = useState(inicial)
  const mover = (i: number, d: number) => {
    const copia = [...ids]
    const [x] = copia.splice(i, 1)
    copia.splice(i + d, 0, x!)
    setIds(copia)
  }
  const nombre = (id: string) => integrantes.find((m) => m.id === id)?.nombre ?? '—'
  const resto = integrantes.filter((m) => !ids.includes(m.id))

  return (
    <div className="rounded-xl p-3 space-y-2" style={{ background: 'var(--fill)' }}>
      <p className="text-[13px]" style={{ color: 'var(--muted)' }}>
        Marca quiénes pueden hacer este puesto, en el orden en que rotan. Si no marcas a nadie, puede hacerlo cualquier integrante.
      </p>
      <ol className="space-y-1">
        {ids.map((id, i) => (
          <li key={id} className="flex items-center gap-2 text-[14px]" style={{ color: 'var(--foreground)' }}>
            <span className="w-5 text-right tabular-nums" style={{ color: 'var(--muted)' }}>{i + 1}.</span>
            <span className="flex-1 truncate">{nombre(id)}</span>
            <button type="button" aria-label={`Subir a ${nombre(id)}`} disabled={i === 0} onClick={() => mover(i, -1)} className="p-1 disabled:opacity-30"><ChevronUp size={16} /></button>
            <button type="button" aria-label={`Bajar a ${nombre(id)}`} disabled={i === ids.length - 1} onClick={() => mover(i, 1)} className="p-1 disabled:opacity-30"><ChevronDown size={16} /></button>
            <button type="button" aria-label={`Quitar a ${nombre(id)}`} onClick={() => setIds(ids.filter((x) => x !== id))} className="p-1" style={{ color: 'var(--destructive)' }}>✕</button>
          </li>
        ))}
      </ol>
      {resto.length > 0 && (
        <select aria-label="Agregar a la lista" value="" onChange={(e) => e.target.value && setIds([...ids, e.target.value])}
          className="h-8 px-2.5 rounded-full text-[14px] outline-none border border-transparent"
          style={{ background: 'var(--surface)', color: 'var(--accent)' }}>
          <option value="">+ Agregar persona</option>
          {resto.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
        </select>
      )}
      {!integrantes.length && <p className="text-[13px]" style={{ color: 'var(--muted)' }}>Primero agrega integrantes al ministerio.</p>}
      <div><Button size="sm" loading={pendiente} onClick={() => onGuardar(ids)}>Guardar lista</Button></div>
    </div>
  )
}
