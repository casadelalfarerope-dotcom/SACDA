'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Trash2, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import Avatar from '@/components/ui/Avatar'
import { Segmentado } from '@/components/ui/ios'
import SelectFondo from '@/components/fondos/SelectFondo'
import SelectorMedio from './SelectorMedio'
import { CATEGORIAS_GASTO, type Medio } from '@/lib/etiquetas'
import { actualizarAporte, eliminarAporte, actualizarGasto, eliminarGasto } from '@/app/actions/finanzas'

const caja = 'rounded-2xl border p-4 space-y-4'
const estiloCaja = { background: 'var(--surface)', borderColor: 'var(--border)' }
const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

type Persona = { id: string; nombre_completo: string; foto_url: string | null }

// Elegir hermano (o anónimo) con buscador.
function ElegirPersona({ persona, onChange }: { persona: Persona | null; onChange: (p: Persona | null) => void }) {
  const [personas, setPersonas] = useState<Persona[]>([])
  const [cambiando, setCambiando] = useState(false)
  const [q, setQ] = useState('')
  useEffect(() => {
    if (!cambiando || personas.length) return
    createClient().from('personas').select('id, nombre_completo, foto_url').neq('estado', 'inactivo').order('nombre_completo')
      .then(({ data }) => setPersonas((data ?? []) as Persona[]))
  }, [cambiando, personas.length])
  const resultados = useMemo(() => {
    const palabras = normalizar(q.trim()).split(/\s+/).filter(Boolean)
    if (!palabras.length) return []
    return personas.filter((p) => palabras.every((w) => normalizar(p.nombre_completo).includes(w))).slice(0, 6)
  }, [q, personas])

  return (
    <div className="space-y-2">
      <span className="block text-[13px] font-medium" style={{ color: 'var(--muted)' }}>Hermano</span>
      <div className="flex items-center gap-3 rounded-[12px] p-2.5" style={{ background: 'var(--fill)' }}>
        {persona
          ? <Avatar nombre={persona.nombre_completo} fotoUrl={persona.foto_url} size="sm" />
          : <span className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--surface)', color: 'var(--muted)' }}><Mail size={16} aria-hidden="true" /></span>}
        <span className="flex-1 min-w-0 text-[15px] font-semibold truncate" style={{ color: 'var(--foreground)' }}>{persona?.nombre_completo ?? 'Anónimo (sobre sin nombre)'}</span>
        <button type="button" onClick={() => setCambiando(!cambiando)} className="text-[14px] font-medium px-2" style={{ color: 'var(--accent)' }}>
          {cambiando ? 'Cerrar' : 'Cambiar'}
        </button>
      </div>
      {cambiando && (
        <div className="space-y-2">
          <label className="relative block">
            <span className="sr-only">Buscar hermano</span>
            <Search size={17} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
            <input autoFocus type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Escribe el nombre…" autoComplete="off"
              className="w-full h-11 pl-10 pr-3 rounded-[12px] text-[16px] outline-none border border-transparent" style={{ background: 'var(--fill)', color: 'var(--foreground)' }} />
          </label>
          {q.trim() && (
            <ul className="rounded-[12px] border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              {resultados.map((p, i) => (
                <li key={p.id} className={i ? 'border-t' : ''} style={{ borderColor: 'var(--border)' }}>
                  <button type="button" onClick={() => { onChange(p); setCambiando(false); setQ('') }}
                    className="w-full flex items-center gap-3 px-3 min-h-[46px] text-left hover:bg-[color:var(--fill)]">
                    <Avatar nombre={p.nombre_completo} fotoUrl={p.foto_url} size="sm" />
                    <span className="text-[15px]" style={{ color: 'var(--foreground)' }}>{p.nombre_completo}</span>
                  </button>
                </li>
              ))}
              {!resultados.length && <li className="px-3 py-3 text-[14px]" style={{ color: 'var(--muted)' }}>Nadie coincide.</li>}
            </ul>
          )}
          {persona && (
            <button type="button" onClick={() => { onChange(null); setCambiando(false) }} className="inline-flex items-center gap-1.5 text-[14px] font-medium" style={{ color: 'var(--accent)' }}>
              <Mail size={15} aria-hidden="true" /> Dejarlo como anónimo
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function BotonEliminar({ texto, confirmar, accion, volverA }: { texto: string; confirmar: string; accion: () => Promise<{ error?: string }>; volverA: string }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [pendiente, iniciar] = useTransition()
  return (
    <div className="space-y-1.5">
      <Button type="button" variant="destructive" size="sm" loading={pendiente} onClick={() => {
        if (!confirm(confirmar)) return
        iniciar(async () => {
          const res = await accion()
          if (res.error) setError(res.error); else router.push(volverA)
        })
      }}>
        <Trash2 size={14} aria-hidden="true" /> {texto}
      </Button>
      {error && <p role="alert" className="text-[13px]" style={{ color: 'var(--error)' }}>{error}</p>}
    </div>
  )
}

export interface AporteEditable {
  id: string; persona: Persona | null; tipo: 'diezmo' | 'ofrenda' | 'pacto' | 'otro'; monto: number
  fecha: string; concepto: string | null; fondo_id: string | null; medio: Medio
}

export function EditarAporte({ aporte, puedeEditar, puedeEliminar }: { aporte: AporteEditable; puedeEditar: boolean; puedeEliminar: boolean }) {
  const router = useRouter()
  const [persona, setPersona] = useState(aporte.persona)
  const [tipo, setTipo] = useState(aporte.tipo)
  const [monto, setMonto] = useState(String(aporte.monto))
  const [medio, setMedio] = useState<Medio>(aporte.medio)
  const [fecha, setFecha] = useState(aporte.fecha)
  const [concepto, setConcepto] = useState(aporte.concepto ?? '')
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [pendiente, iniciar] = useTransition()

  return (
    <div className="space-y-4">
      {puedeEditar && (
        <form noValidate className={caja} style={estiloCaja} onSubmit={(e) => {
          e.preventDefault(); setError(''); setAviso('')
          const fondo = (new FormData(e.currentTarget).get('fondo_id') as string | null) ?? ''
          iniciar(async () => {
            const res = await actualizarAporte(aporte.id, { persona_id: persona?.id ?? '', tipo, monto, fecha, concepto, fondo_id: fondo, medio })
            if (res.error) { setError(res.error); return }
            setAviso('Cambios guardados.')
            router.refresh()
          })
        }}>
          <ElegirPersona persona={persona} onChange={setPersona} />
          <Segmentado etiqueta="Tipo de aporte" ancho valor={tipo} onChange={setTipo}
            opciones={[{ valor: 'diezmo', texto: 'Diezmo' }, { valor: 'ofrenda', texto: 'Ofrenda' }, { valor: 'pacto', texto: 'Pacto' }, { valor: 'otro', texto: 'Otro' }]} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Monto (S/)" inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value)} />
            <Input label="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <SelectorMedio name="medio-editar" valor={medio} onChange={setMedio} />
          <SelectFondo label="Fondo" valor={aporte.fondo_id ?? ''} />
          <Input label="Nota (opcional)" value={concepto} onChange={(e) => setConcepto(e.target.value)} />
          {error && <p role="alert" className="text-[13px]" style={{ color: 'var(--error)' }}>{error}</p>}
          {aviso && <p role="status" className="text-[13px]" style={{ color: 'var(--success)' }}>{aviso}</p>}
          <Button type="submit" loading={pendiente}>Guardar cambios</Button>
        </form>
      )}
      {puedeEliminar && (
        <BotonEliminar texto="Eliminar aporte" volverA="/finanzas/aportes" accion={() => eliminarAporte(aporte.id)}
          confirmar={`¿Eliminar este aporte de S/ ${aporte.monto.toFixed(2)}? Quedará registrado en el historial quién lo eliminó.`} />
      )}
    </div>
  )
}

export interface GastoEditable {
  id: string; concepto: string; monto: number; fecha: string; categoria: string
  descripcion: string | null; fondo_id: string | null; medio: Medio
}

export function EditarGasto({ gasto, puedeEditar, puedeEliminar }: { gasto: GastoEditable; puedeEditar: boolean; puedeEliminar: boolean }) {
  const router = useRouter()
  const [datos, setDatos] = useState({ concepto: gasto.concepto, monto: String(gasto.monto), fecha: gasto.fecha, categoria: gasto.categoria, descripcion: gasto.descripcion ?? '' })
  const [medio, setMedio] = useState<Medio>(gasto.medio)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [pendiente, iniciar] = useTransition()

  return (
    <div className="space-y-4">
      {puedeEditar && (
        <form noValidate className={caja} style={estiloCaja} onSubmit={(e) => {
          e.preventDefault(); setError(''); setAviso('')
          const fondo = (new FormData(e.currentTarget).get('fondo_id') as string | null) ?? ''
          iniciar(async () => {
            const res = await actualizarGasto(gasto.id, { ...datos, fondo_id: fondo, medio })
            if (res.error) { setError(res.error); return }
            setAviso('Cambios guardados.')
            router.refresh()
          })
        }}>
          <Input label="Concepto" value={datos.concepto} onChange={(e) => setDatos({ ...datos, concepto: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Monto (S/)" inputMode="decimal" value={datos.monto} onChange={(e) => setDatos({ ...datos, monto: e.target.value })} />
            <Input label="Fecha" type="date" value={datos.fecha} onChange={(e) => setDatos({ ...datos, fecha: e.target.value })} />
          </div>
          <Select label="Categoría" value={datos.categoria} onChange={(e) => setDatos({ ...datos, categoria: e.target.value })} options={CATEGORIAS_GASTO} />
          <SelectorMedio name="medio-editar" valor={medio} onChange={setMedio} />
          <SelectFondo label="Fondo del que sale" valor={gasto.fondo_id ?? ''} />
          <Input label="Descripción (opcional)" value={datos.descripcion} onChange={(e) => setDatos({ ...datos, descripcion: e.target.value })} />
          {error && <p role="alert" className="text-[13px]" style={{ color: 'var(--error)' }}>{error}</p>}
          {aviso && <p role="status" className="text-[13px]" style={{ color: 'var(--success)' }}>{aviso}</p>}
          <Button type="submit" loading={pendiente}>Guardar cambios</Button>
        </form>
      )}
      {puedeEliminar && (
        <BotonEliminar texto="Eliminar gasto" volverA="/finanzas/gastos" accion={() => eliminarGasto(gasto.id)}
          confirmar={`¿Eliminar el gasto “${gasto.concepto}” de S/ ${gasto.monto.toFixed(2)}? Quedará registrado en el historial quién lo eliminó.`} />
      )}
    </div>
  )
}
