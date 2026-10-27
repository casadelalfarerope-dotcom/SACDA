'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { X, Check, ChevronDown, Mail } from 'lucide-react'
import { registrarAporte } from '@/app/actions/finanzas'
import { createClient } from '@/lib/supabase/client'
import { hoyLima } from '@/lib/utils'
import Avatar from '@/components/ui/Avatar'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import SelectFondo from '@/components/fondos/SelectFondo'
import { Pagina, Segmentado, Grupo, Fila } from '@/components/ui/ios'
import { etiquetaTipoAporte, etiquetaMedio, esDigital, type Medio } from '@/lib/etiquetas'
import SelectorMedio from '@/components/finanzas/SelectorMedio'
import BuscadorPersona from '@/components/ui/BuscadorPersona'

type Persona = { id: string; nombre_completo: string; foto_url: string | null }
// Sobre sin nombre: se registra sin persona.
const ANONIMO: Persona = { id: '', nombre_completo: 'Anónimo (sobre sin nombre)', foto_url: null }
type Tipo = 'diezmo' | 'ofrenda' | 'pacto' | 'otro'

const soles = (n: number) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n)

// Registro rápido de aportes: se busca al hermano, se elige el tipo, se escribe
// el monto y se registra. La pantalla queda lista para el siguiente.
export default function NuevoAportePage() {
  const [personas, setPersonas] = useState<Persona[]>([])
  const [persona, setPersona] = useState<Persona | null>(null)
  const [tipo, setTipo] = useState<Tipo>('diezmo')
  const [medio, setMedio] = useState<Medio>('efectivo')
  const [monto, setMonto] = useState('')
  const [fecha, setFecha] = useState(hoyLima())
  const [concepto, setConcepto] = useState('')
  const [masOpciones, setMasOpciones] = useState(false)
  const [error, setError] = useState('')
  const [registrados, setRegistrados] = useState<{ nombre: string; tipo: Tipo; monto: number; medio: Medio }[]>([])
  const [pendiente, iniciar] = useTransition()
  const campoMonto = useRef<HTMLInputElement>(null)
  const formulario = useRef<HTMLFormElement>(null)

  useEffect(() => {
    createClient().from('personas').select('id, nombre_completo, foto_url').neq('estado', 'inactivo').order('nombre_completo')
      .then(({ data }) => setPersonas((data ?? []) as Persona[]))
  }, [])

  const opciones = useMemo(() => personas.map((p) => ({ id: p.id, nombre: p.nombre_completo, foto_url: p.foto_url })), [personas])
  function elegir(p: Persona) {
    setPersona(p); setError('')
    setTimeout(() => campoMonto.current?.focus(), 0)
  }

  function registrar(e: React.FormEvent) {
    e.preventDefault()
    if (!persona) { setError('Busca y elige al hermano, o marca que es anónimo.'); return }
    const fondo = new FormData(formulario.current!).get('fondo_id') as string | null
    setError('')
    iniciar(async () => {
      const res = await registrarAporte({ persona_id: persona.id, tipo, monto, fecha, concepto, fondo_id: fondo ?? '', medio })
      if (res.error) { setError(res.error); return }
      setRegistrados((r) => [{ nombre: persona.id ? persona.nombre_completo : 'Anónimo', tipo, monto: Number(monto), medio }, ...r])
      setPersona(null); setMonto(''); setConcepto('')
      setTimeout(() => document.getElementById('buscar-hermano')?.focus(), 0)
    })
  }

  const total = registrados.reduce((s, r) => s + r.monto, 0)
  const enDigital = registrados.filter((r) => esDigital(r.medio)).reduce((s, r) => s + r.monto, 0)

  return (
    <Pagina ancho="estrecho" titulo="Registrar aportes" subtitulo="Busca al hermano, elige el tipo y escribe el monto"
      volver={{ href: '/finanzas/aportes', texto: 'Aportes' }}>
      <form ref={formulario} onSubmit={registrar} noValidate className="rounded-2xl border p-4 space-y-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        {/* 1. Hermano */}
        {persona ? (
          <div className="flex items-center gap-3 rounded-[12px] p-2.5" style={{ background: 'var(--fill)' }}>
            {persona.id
              ? <Avatar nombre={persona.nombre_completo} fotoUrl={persona.foto_url} size="sm" />
              : <span className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--surface)', color: 'var(--muted)' }}><Mail size={16} aria-hidden="true" /></span>}
            <span className="flex-1 min-w-0 text-[16px] font-semibold truncate" style={{ color: 'var(--foreground)' }}>{persona.nombre_completo}</span>
            <button type="button" onClick={() => { setPersona(null); setTimeout(() => document.getElementById('buscar-hermano')?.focus(), 0) }}
              aria-label="Cambiar de hermano" className="w-8 h-8 rounded-full flex items-center justify-center" style={{ color: 'var(--muted)' }}>
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div>
            <BuscadorPersona id="buscar-hermano" autoFocus agregar personas={opciones} placeholder="Escribe el nombre del hermano…"
              onChange={(id) => { const p = personas.find((x) => x.id === id); if (p) elegir(p) }} />
            <button type="button" onClick={() => elegir(ANONIMO)}
              className="mt-2 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[14px] font-medium"
              style={{ color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 12%, transparent)' }}>
              <Mail size={15} aria-hidden="true" /> Sobre sin nombre (anónimo)
            </button>
          </div>
        )}

        {/* 2. Tipo */}
        <Segmentado etiqueta="Tipo de aporte" ancho valor={tipo} onChange={setTipo}
          opciones={[{ valor: 'diezmo', texto: 'Diezmo' }, { valor: 'ofrenda', texto: 'Ofrenda' }, { valor: 'pacto', texto: 'Pacto' }, { valor: 'otro', texto: 'Otro' }]} />

        {/* 3. Monto */}
        <label className="block">
          <span className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Monto</span>
          <span className="flex items-center gap-2 h-14 px-4 rounded-[12px]" style={{ background: 'var(--fill)' }}>
            <span className="text-[20px] font-semibold" style={{ color: 'var(--muted)' }}>S/</span>
            <input ref={campoMonto} inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value.replace(',', '.'))}
              placeholder="0.00" aria-label="Monto en soles"
              className="flex-1 min-w-0 bg-transparent text-[24px] font-semibold tabular-nums outline-none" style={{ color: 'var(--foreground)' }} />
          </span>
        </label>

        {/* 4. Medio de pago (se mantiene para el siguiente) */}
        <SelectorMedio name="medio-aporte" valor={medio} onChange={setMedio} />

        {/* Más opciones: fecha, fondo y nota */}
        <button type="button" onClick={() => setMasOpciones(!masOpciones)} aria-expanded={masOpciones}
          className="flex items-center gap-1 text-[14px]" style={{ color: 'var(--accent)' }}>
          <ChevronDown size={16} aria-hidden="true" style={{ transform: masOpciones ? 'rotate(180deg)' : undefined }} />
          Fecha, fondo y nota {fecha !== hoyLima() && `· ${fecha.split('-').reverse().join('/')}`}
        </button>
        <div className="space-y-3" hidden={!masOpciones}>
          <Input label="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          <SelectFondo label="¿Para qué fondo es?" />
          <Input label="Nota (opcional)" value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Ej. Ofrenda para misiones" />
        </div>

        {error && <p role="alert" className="text-[13px]" style={{ color: 'var(--error)' }}>{error}</p>}
        <Button type="submit" size="lg" className="w-full" loading={pendiente} disabled={!persona || !monto}>
          {persona && Number(monto) > 0 ? `Registrar ${soles(Number(monto))}` : 'Registrar'}
        </Button>
      </form>

      {registrados.length > 0 && (
        <Grupo titulo={`Registrados ahora (${registrados.length})`} pie={`Total: ${soles(total)} · Efectivo: ${soles(total - enDigital)} · Digital: ${soles(enDigital)}`}>
          {registrados.map((r, i) => (
            <Fila key={i} primero={i === 0} inicio={<Check size={18} aria-hidden="true" style={{ color: 'var(--success)' }} />}
              titulo={r.nombre} subtitulo={`${etiquetaTipoAporte(r.tipo)} · ${etiquetaMedio(r.medio)}`}
              detalle={<span className="font-semibold tabular-nums" style={{ color: 'var(--success)' }}>+{soles(r.monto)}</span>} />
          ))}
        </Grupo>
      )}
    </Pagina>
  )
}
