'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import { Segmentado } from '@/components/ui/ios'
import SelectorMedio from '@/components/finanzas/SelectorMedio'
import type { Medio } from '@/lib/etiquetas'
import { hoyLima } from '@/lib/utils'
import { guardarFondo, registrarMovimientoFondo, traspasarFondos, eliminarMovimientoFondo } from '@/app/actions/fondos'

const caja = 'rounded-2xl border p-4 space-y-3'
const estiloCaja = { background: 'var(--surface)', borderColor: 'var(--border)' }
const soles = (n: number) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n)

// Crear o editar un fondo (Tesorería).
export function FormFondo({ fondo, ministerios, alTerminar }: {
  fondo?: { id: string; nombre: string; descripcion: string | null; grupo_id: string | null; meta: number | null; activo: boolean }
  ministerios: { value: string; label: string }[]
  alTerminar?: () => void
}) {
  const router = useRouter()
  const [datos, setDatos] = useState({
    nombre: fondo?.nombre ?? '', descripcion: fondo?.descripcion ?? '', grupo_id: fondo?.grupo_id ?? '',
    meta: fondo?.meta ? String(fondo.meta) : '', activo: fondo?.activo ?? true,
  })
  const [error, setError] = useState('')
  const [pendiente, iniciar] = useTransition()
  return (
    <form noValidate className={caja} style={estiloCaja} onSubmit={(e) => {
      e.preventDefault(); setError('')
      iniciar(async () => {
        const res = await guardarFondo({ id: fondo?.id, ...datos })
        if (res.error) { setError(res.error); return }
        if (fondo) { alTerminar?.(); router.refresh() } else router.push(`/finanzas/fondos/${res.id}`)
      })
    }}>
      <Input label="Nombre del fondo *" value={datos.nombre} onChange={(e) => setDatos({ ...datos, nombre: e.target.value })} placeholder="Ej. Jóvenes, Renovación de instrumentos" />
      <Select label="Ministerio dueño (su líder podrá registrar ingresos y gastos)" value={datos.grupo_id}
        onChange={(e) => setDatos({ ...datos, grupo_id: e.target.value })} options={[{ value: '', label: 'Ninguno (lo maneja Tesorería)' }, ...ministerios]} />
      <Input label="Meta (opcional)" inputMode="decimal" value={datos.meta} onChange={(e) => setDatos({ ...datos, meta: e.target.value })} placeholder="Ej. 3000" />
      <Input label="Para qué es (opcional)" value={datos.descripcion} onChange={(e) => setDatos({ ...datos, descripcion: e.target.value })} placeholder="Ej. Comprar una consola de sonido nueva" />
      {fondo && (
        <label className="flex items-center gap-2 text-[14px]" style={{ color: 'var(--foreground)' }}>
          <input type="checkbox" checked={datos.activo} onChange={(e) => setDatos({ ...datos, activo: e.target.checked })} />
          Fondo activo (desmárcalo cuando ya no se use)
        </label>
      )}
      {error && <p role="alert" className="text-[13px]" style={{ color: 'var(--error)' }}>{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={pendiente}>{fondo ? 'Guardar cambios' : 'Crear fondo'}</Button>
        {alTerminar && <Button type="button" size="sm" variant="ghost" onClick={alTerminar}>Cancelar</Button>}
      </div>
    </form>
  )
}

// Botón que abre el formulario de edición del fondo.
export function EditarFondo(props: Omit<Parameters<typeof FormFondo>[0], 'alTerminar'>) {
  const [abierto, setAbierto] = useState(false)
  if (!abierto) return <Button size="sm" variant="secondary" onClick={() => setAbierto(true)}>Editar fondo</Button>
  return <FormFondo {...props} alTerminar={() => setAbierto(false)} />
}

// Registrar un ingreso o un gasto del fondo. Si el gasto deja el fondo en
// negativo se pide confirmación (se permite, pero no es lo ideal).
export function FormMovimiento({ fondoId, saldo }: { fondoId: string; saldo: number }) {
  const router = useRouter()
  const vacio = { tipo: 'ingreso' as 'ingreso' | 'egreso', concepto: '', monto: '', fecha: hoyLima(), medio: 'efectivo' as Medio }
  const [datos, setDatos] = useState(vacio)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [pendiente, iniciar] = useTransition()
  return (
    <form noValidate className={caja} style={estiloCaja} onSubmit={(e) => {
      e.preventDefault(); setError(''); setAviso('')
      const monto = Number(datos.monto.replace(',', '.'))
      if (datos.tipo === 'egreso' && monto > saldo &&
        !confirm(`El fondo tiene ${soles(saldo)}. Con este gasto quedará en ${soles(saldo - monto)} (negativo). ¿Registrarlo de todos modos?`)) return
      iniciar(async () => {
        const res = await registrarMovimientoFondo({ fondo_id: fondoId, ...datos })
        if (res.error) { setError(res.error); return }
        setAviso(datos.tipo === 'ingreso' ? 'Ingreso registrado.' : 'Gasto registrado.')
        setDatos({ ...vacio, tipo: datos.tipo, medio: datos.medio })
        router.refresh()
      })
    }}>
      <Segmentado etiqueta="Tipo de movimiento" ancho valor={datos.tipo} onChange={(tipo) => setDatos({ ...datos, tipo })}
        opciones={[{ valor: 'ingreso', texto: 'Entró dinero' }, { valor: 'egreso', texto: 'Salió dinero' }]} />
      <Input label="Concepto *" value={datos.concepto} onChange={(e) => setDatos({ ...datos, concepto: e.target.value })}
        placeholder={datos.tipo === 'ingreso' ? 'Ej. Venta de postres' : 'Ej. Cuerdas para la guitarra'} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Monto (S/) *" inputMode="decimal" value={datos.monto} onChange={(e) => setDatos({ ...datos, monto: e.target.value })} placeholder="0.00" />
        <Input label="Fecha *" type="date" value={datos.fecha} onChange={(e) => setDatos({ ...datos, fecha: e.target.value })} />
      </div>
      <SelectorMedio name="medio-fondo" valor={datos.medio} onChange={(medio) => setDatos({ ...datos, medio })}
        etiqueta={datos.tipo === 'ingreso' ? '¿Cómo llegó el dinero?' : '¿Cómo se pagó?'} />
      {error && <p role="alert" className="text-[13px]" style={{ color: 'var(--error)' }}>{error}</p>}
      {aviso && <p role="status" className="text-[13px]" style={{ color: 'var(--success)' }}>{aviso}</p>}
      <Button type="submit" size="sm" loading={pendiente}>Registrar</Button>
    </form>
  )
}

// Pasar dinero entre fondos (solo Tesorería).
export function FormTraspaso({ fondos, hacia }: { fondos: { value: string; label: string }[]; hacia?: string }) {
  const router = useRouter()
  const opciones = [{ value: 'general', label: 'Fondo General' }, ...fondos]
  const [datos, setDatos] = useState({ desde: 'general', hacia: hacia ?? fondos[0]?.value ?? '', monto: '', fecha: hoyLima(), concepto: '' })
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [pendiente, iniciar] = useTransition()
  return (
    <form noValidate className={caja} style={estiloCaja} onSubmit={(e) => {
      e.preventDefault(); setError(''); setAviso('')
      iniciar(async () => {
        const res = await traspasarFondos(datos)
        if (res.error) { setError(res.error); return }
        setAviso('Traspaso registrado.')
        setDatos({ ...datos, monto: '', concepto: '' })
        router.refresh()
      })
    }}>
      <div className="grid grid-cols-2 gap-3">
        <Select label="Desde" value={datos.desde} onChange={(e) => setDatos({ ...datos, desde: e.target.value })} options={opciones} />
        <Select label="Hacia" value={datos.hacia} onChange={(e) => setDatos({ ...datos, hacia: e.target.value })} options={opciones} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Monto (S/) *" inputMode="decimal" value={datos.monto} onChange={(e) => setDatos({ ...datos, monto: e.target.value })} placeholder="0.00" />
        <Input label="Fecha *" type="date" value={datos.fecha} onChange={(e) => setDatos({ ...datos, fecha: e.target.value })} />
      </div>
      <Input label="Nota (opcional)" value={datos.concepto} onChange={(e) => setDatos({ ...datos, concepto: e.target.value })} placeholder="Ej. Apoyo para el campamento" />
      {error && <p role="alert" className="text-[13px]" style={{ color: 'var(--error)' }}>{error}</p>}
      {aviso && <p role="status" className="text-[13px]" style={{ color: 'var(--success)' }}>{aviso}</p>}
      <Button type="submit" size="sm" loading={pendiente}>Traspasar</Button>
    </form>
  )
}

export function BorrarMovimiento({ id, traspaso }: { id: string; traspaso: boolean }) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  return (
    <button type="button" disabled={pendiente} aria-label="Borrar movimiento" className="p-1.5 rounded-full" style={{ color: 'var(--muted)' }}
      onClick={() => {
        if (!confirm(traspaso ? '¿Borrar este traspaso? Se quitará de los dos fondos.' : '¿Borrar este movimiento?')) return
        iniciar(async () => {
          const res = await eliminarMovimientoFondo(id)
          if (res.error) alert(res.error); else router.refresh()
        })
      }}>
      <Trash2 size={15} aria-hidden="true" />
    </button>
  )
}
