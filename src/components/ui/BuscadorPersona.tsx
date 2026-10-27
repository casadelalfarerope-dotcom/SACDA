'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Search, X, UserPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Avatar from '@/components/ui/Avatar'

export interface PersonaOpcion { id: string; nombre: string; foto_url?: string | null; detalle?: string }

const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const MAX = 8

// Personas activas de la iglesia (se cargan una vez por página).
let cache: Promise<PersonaOpcion[]> | null = null
function congregantes() {
  cache ??= Promise.resolve(createClient().from('personas').select('id, nombre_completo, foto_url').neq('estado', 'inactivo').order('nombre_completo'))
    .then(({ data }) => (data ?? []).map((p) => ({ id: p.id as string, nombre: p.nombre_completo as string, foto_url: p.foto_url as string | null })))
  return cache
}

// Buscador para elegir una persona: se escribe, se elige y queda seleccionada.
// Es el único patrón para elegir personas en todo el sistema (las listas de
// personas crecen; un desplegable sería muy largo).
// - personas: lista a mostrar (p. ej. integrantes). Sin ella, busca entre los congregantes.
// - agregar: tras elegir, el campo se limpia para agregar a otra persona.
export default function BuscadorPersona({ personas, value, defaultValue, onChange, name, label, required, placeholder,
  excluir, agregar, disabled, autoFocus, id, vacio, error, compacto }: {
  personas?: PersonaOpcion[]
  value?: string
  defaultValue?: string
  onChange?: (id: string, persona?: PersonaOpcion) => void
  name?: string
  label?: string
  required?: boolean
  placeholder?: string
  excluir?: string[]
  agregar?: boolean
  disabled?: boolean
  autoFocus?: boolean
  id?: string
  vacio?: string           // texto cuando no hay nadie elegido y se puede dejar así (p. ej. "Sin asignar")
  error?: string
  compacto?: boolean
}) {
  const autoId = useId()
  const campoId = id ?? autoId
  const [cargadas, setCargadas] = useState<PersonaOpcion[]>(personas ?? [])
  const lista = personas ?? cargadas
  const [interno, setInterno] = useState(defaultValue ?? '')
  const actual = agregar ? '' : value ?? interno
  const [texto, setTexto] = useState('')
  const [enfocado, setEnfocado] = useState(false)
  const [activo, setActivo] = useState(0)
  const campo = useRef<HTMLInputElement>(null)

  useEffect(() => { if (!personas) congregantes().then(setCargadas) }, [personas])

  const elegida = actual ? lista.find((p) => p.id === actual) : undefined
  const disponibles = useMemo(() => lista.filter((p) => !excluir?.includes(p.id)), [lista, excluir])
  const resultados = useMemo(() => {
    const q = normalizar(texto.trim())
    if (!q) return disponibles.slice(0, MAX)
    // Coincide si todas las palabras escritas están en el nombre (en cualquier orden).
    const palabras = q.split(/\s+/)
    return disponibles.filter((p) => { const n = normalizar(p.nombre); return palabras.every((w) => n.includes(w)) }).slice(0, MAX)
  }, [texto, disponibles])
  useEffect(() => setActivo(0), [texto])

  function elegir(p: PersonaOpcion | null) {
    setTexto('')
    if (!agregar && value === undefined) setInterno(p?.id ?? '')
    onChange?.(p?.id ?? '', p ?? undefined)
    if (agregar) setTimeout(() => campo.current?.focus(), 0)
    else if (!p) setTimeout(() => campo.current?.focus(), 0)
    else setEnfocado(false)
  }

  const alto = compacto ? 'h-10' : 'h-11'
  const verLista = enfocado && !disabled && (texto.trim() !== '' || disponibles.length > 0)

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={campoId} className="block text-[13px] font-medium" style={{ color: 'var(--muted)' }}>
          {label}{required && <span style={{ color: 'var(--error)' }}> *</span>}
        </label>
      )}
      {name && <input type="hidden" name={name} value={actual} />}

      {elegida || (actual && !agregar) ? (
        <div className={`flex items-center gap-2.5 ${alto} pl-1.5 pr-1 rounded-[10px]`} style={{ background: 'var(--fill)' }}>
          <Avatar nombre={elegida?.nombre ?? '…'} fotoUrl={elegida?.foto_url ?? null} size="sm" />
          <span className="flex-1 min-w-0">
            <span className="block text-[15px] font-medium truncate" style={{ color: 'var(--foreground)' }}>{elegida?.nombre ?? 'Cargando…'}</span>
            {elegida?.detalle && <span className="block text-[12px] truncate" style={{ color: 'var(--muted)' }}>{elegida.detalle}</span>}
          </span>
          {!disabled && (
            <button type="button" onClick={() => elegir(null)} aria-label={`Quitar a ${elegida?.nombre ?? 'la persona'}`}
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ color: 'var(--muted)' }}>
              <X size={17} aria-hidden="true" />
            </button>
          )}
        </div>
      ) : (
        <div className="relative">
          <span className="relative block">
            {agregar
              ? <UserPlus size={16} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--accent)' }} />
              : <Search size={16} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />}
            <input ref={campo} id={campoId} type="search" value={texto} disabled={disabled} autoFocus={autoFocus} autoComplete="off"
              role="combobox" aria-expanded={verLista} aria-controls={`${campoId}-lista`} aria-autocomplete="list"
              aria-invalid={!!error || undefined}
              placeholder={placeholder ?? (agregar ? 'Agregar persona: escribe su nombre…' : vacio ? `${vacio} · Escribe para buscar…` : 'Escribe el nombre…')}
              onChange={(e) => setTexto(e.target.value)}
              onFocus={() => setEnfocado(true)}
              onBlur={() => setTimeout(() => setEnfocado(false), 150)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setActivo((i) => Math.min(resultados.length - 1, i + 1)) }
                else if (e.key === 'ArrowUp') { e.preventDefault(); setActivo((i) => Math.max(0, i - 1)) }
                else if (e.key === 'Enter') { e.preventDefault(); if (resultados[activo]) elegir(resultados[activo]) }
                else if (e.key === 'Escape') { setTexto(''); campo.current?.blur() }
              }}
              className={`w-full ${alto} pl-9 pr-3 rounded-[10px] text-[15px] outline-none border disabled:opacity-50`}
              style={{ background: 'var(--fill)', color: 'var(--foreground)', borderColor: error ? 'var(--error)' : 'transparent' }} />
          </span>
          {verLista && (
            <ul id={`${campoId}-lista`} role="listbox" className="mt-1.5 rounded-[12px] border p-1 animate-scale"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-float)' }}>
              {resultados.map((p, i) => (
                <li key={p.id} role="option" aria-selected={i === activo}>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => elegir(p)} onMouseEnter={() => setActivo(i)}
                    className="w-full flex items-center gap-2.5 px-2 min-h-[44px] rounded-[10px] text-left"
                    style={{ background: i === activo ? 'var(--fill)' : undefined }}>
                    <Avatar nombre={p.nombre} fotoUrl={p.foto_url ?? null} size="sm" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[15px] truncate" style={{ color: 'var(--foreground)' }}>{p.nombre}</span>
                      {p.detalle && <span className="block text-[12px] truncate" style={{ color: 'var(--muted)' }}>{p.detalle}</span>}
                    </span>
                  </button>
                </li>
              ))}
              {!resultados.length && (
                <li className="px-3 py-2.5 text-[14px]" style={{ color: 'var(--muted)' }}>
                  {disponibles.length ? 'Nadie coincide. Revisa el nombre.' : 'No hay más personas para elegir.'}
                </li>
              )}
              {!texto.trim() && disponibles.length > MAX && (
                <li className="px-3 pt-1.5 pb-1 text-[12px]" style={{ color: 'var(--muted)' }}>
                  Escribe para buscar entre las {disponibles.length} personas.
                </li>
              )}
            </ul>
          )}
        </div>
      )}
      {error && <p className="text-xs" style={{ color: 'var(--destructive)' }}>{error}</p>}
    </div>
  )
}
