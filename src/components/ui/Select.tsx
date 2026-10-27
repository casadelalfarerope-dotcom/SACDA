'use client'

import { cn } from '@/lib/utils'
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import Flotante from '@/components/ui/Flotante'

export interface Opcion { value: string; label: string }

interface SelectProps {
  label?: string
  error?: string
  options: Opcion[]
  placeholder?: string        // opción vacía ("Sin asignar", "Ninguno"…)
  value?: string
  defaultValue?: string
  onChange?: (e: { target: { value: string } }) => void
  name?: string               // para formularios: se envía en un campo oculto
  id?: string
  disabled?: boolean
  required?: boolean
  className?: string
  style?: CSSProperties
  'aria-label'?: string
  variante?: 'campo' | 'pildora'
}

// Selector propio del sistema para listas cortas (estados, tipos, categorías).
// Para elegir personas usa BuscadorPersona.
export default function Select({ label, error, options, placeholder, value, defaultValue, onChange, name, id, disabled,
  required, className, style, variante = 'campo', ...resto }: SelectProps) {
  const autoId = useId()
  const selectId = id ?? autoId
  const [interno, setInterno] = useState(defaultValue ?? (placeholder !== undefined ? '' : options[0]?.value ?? ''))
  const actual = value ?? interno
  const [abierto, setAbierto] = useState(false)
  const [activo, setActivo] = useState(0)
  const boton = useRef<HTMLButtonElement>(null)
  const cerrar = useCallback(() => setAbierto(false), [])

  const opciones: Opcion[] = placeholder !== undefined ? [{ value: '', label: placeholder }, ...options] : options
  const elegida = opciones.find((o) => o.value === actual)

  useEffect(() => {
    if (abierto) setActivo(Math.max(0, opciones.findIndex((o) => o.value === actual)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto])

  function elegir(v: string) {
    setAbierto(false)
    boton.current?.focus()
    if (v === actual) return
    if (value === undefined) setInterno(v)
    onChange?.({ target: { value: v } })
  }

  function teclado(e: React.KeyboardEvent) {
    if (!abierto) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); setAbierto(true) }
      return
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActivo((i) => Math.min(opciones.length - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActivo((i) => Math.max(0, i - 1)) }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (opciones[activo]) elegir(opciones[activo].value) }
    else if (e.key === 'Tab') setAbierto(false)
  }

  const pildora = variante === 'pildora'
  const texto = elegida?.label ?? placeholder ?? 'Elegir…'
  const vacio = !elegida || elegida.value === ''

  return (
    <div className={pildora ? 'inline-block' : 'space-y-1.5'}>
      {label && (
        <label htmlFor={selectId} className="block text-[13px] font-medium" style={{ color: 'var(--muted)' }}>
          {label}{required && <span style={{ color: 'var(--error)' }}> *</span>}
        </label>
      )}
      <button ref={boton} id={selectId} type="button" disabled={disabled} aria-haspopup="listbox" aria-expanded={abierto}
        aria-label={resto['aria-label']} aria-invalid={!!error || undefined}
        onClick={() => setAbierto((v) => !v)} onKeyDown={teclado}
        className={cn(
          pildora
            ? 'h-8 pl-3 pr-2 rounded-full text-[13px] font-medium inline-flex items-center gap-1'
            : 'w-full h-11 px-3.5 pr-10 rounded-[10px] text-[15px] text-left border relative',
          'outline-none transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-default',
          !pildora && (error ? 'border-[color:var(--error)]' : 'border-transparent'),
          className,
        )}
        style={{ background: 'var(--fill)', color: vacio && !pildora ? 'var(--muted)' : 'var(--foreground)', ...style }}>
        <span className={pildora ? 'whitespace-nowrap' : 'block truncate'}>{texto}</span>
        <ChevronDown size={pildora ? 14 : 16} aria-hidden="true"
          className={cn('transition-transform', !pildora && 'absolute right-3 top-1/2 -translate-y-1/2', abierto && 'rotate-180')}
          style={{ color: pildora ? 'currentColor' : 'var(--muted)' }} />
      </button>
      {name && <input type="hidden" name={name} value={actual} />}

      <Flotante ancla={boton} abierto={abierto} onCerrar={cerrar} etiqueta={label ?? resto['aria-label']}
        ancho={pildora ? 200 : undefined} alinear={pildora ? 'fin' : 'inicio'}>
        {opciones.map((o, i) => {
          const sel = o.value === actual
          return (
            <button key={o.value || '_vacio'} type="button" role="option" aria-selected={sel}
              onClick={() => elegir(o.value)} onMouseEnter={() => setActivo(i)}
              className="w-full flex items-center gap-2 min-h-[44px] px-3 rounded-[10px] text-left text-[15px]"
              style={{
                background: i === activo ? 'var(--fill)' : undefined,
                color: o.value === '' ? 'var(--muted)' : 'var(--foreground)',
                fontWeight: sel ? 600 : undefined,
              }}>
              <span className="flex-1 min-w-0">{o.label}</span>
              {sel && <Check size={17} aria-hidden="true" style={{ color: 'var(--accent)' }} />}
            </button>
          )
        })}
      </Flotante>
      {error && <p className="text-xs" style={{ color: 'var(--destructive)' }}>{error}</p>}
    </div>
  )
}
