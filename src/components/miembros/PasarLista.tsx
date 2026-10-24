'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Search, Lock, UserPlus } from 'lucide-react'
import Input from '@/components/ui/Input'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import { marcarVino, cerrarListaAhora, registrarPersonaNueva } from '@/app/actions/asistencia'

export interface PersonaLista { id: string; nombre: string; foto: string | null; nuevo?: boolean }

const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Pasar lista en el culto: por defecto nadie vino; se busca al hermano y se
// toca "Vino". Al cerrar la lista, los demás quedan como ausencias.
export default function PasarLista({ eventoId, fecha, fechaReal, personas, presentesIniciales, cerrada, puedeCerrar }: {
  eventoId: string
  fecha: string
  fechaReal: string
  personas: PersonaLista[]
  presentesIniciales: string[]
  cerrada: boolean
  puedeCerrar: boolean
}) {
  const router = useRouter()
  const [lista, setLista] = useState(personas)
  const [presentes, setPresentes] = useState(() => new Set(presentesIniciales))
  const [nueva, setNueva] = useState<{ nombre: string; telefono: string; invitado_por: string } | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [soloFaltan, setSoloFaltan] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [pendiente, iniciar] = useTransition()

  const visibles = useMemo(() => {
    const q = normalizar(busqueda.trim())
    return lista.filter((p) => (!q || normalizar(p.nombre).includes(q)) && (!soloFaltan || !presentes.has(p.id)))
  }, [lista, busqueda, soloFaltan, presentes])

  function guardarNueva(e: React.FormEvent) {
    e.preventDefault()
    if (!nueva) return
    setError('')
    iniciar(async () => {
      const res = await registrarPersonaNueva(eventoId, fecha, fechaReal, nueva)
      if (res.error || !res.persona) { setError(res.error ?? 'No se pudo registrar.'); return }
      const p = res.persona
      setLista((l) => [...l, { id: p.id, nombre: p.nombre, foto: null, nuevo: true }].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      setPresentes((s) => new Set(s).add(p.id))
      setAviso(`${p.nombre} quedó registrado como persona nueva y marcado como que vino.`)
      setNueva(null)
      router.refresh()
    })
  }

  function alternar(id: string) {
    const vino = !presentes.has(id)
    setPresentes((s) => { const n = new Set(s); if (vino) n.add(id); else n.delete(id); return n })
    setError('')
    iniciar(async () => {
      const res = await marcarVino(eventoId, fecha, id, vino)
      if (res.error) {
        setError(res.error)
        setPresentes((s) => { const n = new Set(s); if (vino) n.delete(id); else n.add(id); return n })
      }
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-[15px]" style={{ color: 'var(--foreground)' }}>
          <b className="text-[22px] tabular-nums" style={{ color: 'var(--success)' }}>{presentes.size}</b>
          <span style={{ color: 'var(--muted)' }}> de {lista.length} {presentes.size === 1 ? 'vino' : 'vinieron'}</span>
        </p>
        {cerrada ? (
          <span className="inline-flex items-center gap-1.5 text-[13px]" style={{ color: 'var(--muted)' }}><Lock size={13} aria-hidden="true" /> Lista cerrada: los que faltaron están en “Faltaron”</span>
        ) : puedeCerrar && (
          <Button size="sm" variant="secondary" disabled={pendiente || !presentes.size} onClick={() => {
            if (!confirm(`¿Cerrar la lista? Las ${lista.filter((p) => !p.nuevo).length - presentes.size} personas no marcadas quedarán como ausencias por contactar.`)) return
            iniciar(async () => {
              const res = await cerrarListaAhora(eventoId, fecha, fechaReal)
              if (res.error) setError(res.error)
              else { setAviso(`Lista cerrada: ${res.generadas} ${res.generadas === 1 ? 'ausencia' : 'ausencias'} por contactar.`); router.refresh() }
            })
          }}>
            <Lock size={14} aria-hidden="true" /> Cerrar lista
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <label className="relative flex-1">
          <span className="sr-only">Buscar hermano</span>
          <Search size={17} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre…" type="search"
            className="w-full h-11 pl-10 pr-3 rounded-[10px] text-[16px] outline-none border border-transparent"
            style={{ background: 'var(--fill)', color: 'var(--foreground)' }} />
        </label>
        <label className="inline-flex items-center gap-2 text-[14px] px-1" style={{ color: 'var(--foreground)' }}>
          <input type="checkbox" checked={soloFaltan} onChange={(e) => setSoloFaltan(e.target.checked)} />
          Solo los que faltan marcar
        </label>
      </div>

      {nueva ? (
        <form onSubmit={guardarNueva} noValidate className="rounded-2xl border p-4 space-y-3" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <p className="text-[15px] font-semibold" style={{ color: 'var(--foreground)' }}>Persona que viene por primera vez</p>
          <Input label="Nombre completo *" autoFocus value={nueva.nombre} onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })} placeholder="Ej. María García López" />
          <Input label="Teléfono / WhatsApp" type="tel" inputMode="tel" value={nueva.telefono} onChange={(e) => setNueva({ ...nueva, telefono: e.target.value })} placeholder="+51 999 888 777" />
          <div className="space-y-1.5">
            <label htmlFor="invitado-por" className="block text-[13px] font-medium" style={{ color: 'var(--muted)' }}>¿Quién la invitó?</label>
            <select id="invitado-por" value={nueva.invitado_por} onChange={(e) => setNueva({ ...nueva, invitado_por: e.target.value })}
              className="w-full h-11 px-3.5 rounded-[10px] text-[15px] outline-none border border-transparent" style={{ background: 'var(--fill)', color: 'var(--foreground)' }}>
              <option value="">Nadie / no sabe</option>
              {lista.filter((p) => !p.nuevo).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" loading={pendiente}>Registrar y marcar que vino</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setNueva(null)}>Cancelar</Button>
          </div>
        </form>
      ) : (
        <Button size="sm" variant="secondary" onClick={() => { setAviso(''); setNueva({ nombre: busqueda.trim(), telefono: '', invitado_por: '' }) }}>
          <UserPlus size={14} aria-hidden="true" /> Persona nueva
        </Button>
      )}

      <ul className="rounded-2xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        {visibles.map((p, i) => {
          const vino = presentes.has(p.id)
          return (
            <li key={p.id} className={i ? 'border-t' : ''} style={{ borderColor: 'var(--border)' }}>
              <button type="button" onClick={() => alternar(p.id)} aria-pressed={vino}
                className="w-full flex items-center gap-3 px-4 min-h-[56px] text-left transition-colors hover:bg-[color:var(--fill)]">
                <Avatar nombre={p.nombre} fotoUrl={p.foto} size="sm" />
                <span className="flex-1 min-w-0 text-[15px] truncate" style={{ color: 'var(--foreground)', fontWeight: vino ? 600 : 450 }}>
                  {p.nombre}
                  {p.nuevo && <span className="ml-2 text-[11px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent)' }}>Nuevo</span>}
                </span>
                <span className="inline-flex items-center gap-1 h-8 px-3 rounded-full text-[13px] font-semibold flex-shrink-0 transition-all"
                  style={vino
                    ? { background: 'var(--success)', color: '#fff' }
                    : { background: 'transparent', color: 'var(--muted)', boxShadow: 'inset 0 0 0 1.5px var(--border)' }}>
                  {vino ? <><Check size={14} aria-hidden="true" /> Vino</> : 'No vino'}
                </span>
              </button>
            </li>
          )
        })}
        {!visibles.length && (
          <li className="px-4 py-4 text-[15px]" style={{ color: 'var(--muted)' }}>
            {lista.length ? 'Nadie coincide con la búsqueda. Si es alguien que viene por primera vez, usa “Persona nueva”.' : 'No hay congregantes activos registrados.'}
          </li>
        )}
      </ul>
      {error && <p role="alert" className="text-[13px]" style={{ color: 'var(--error)' }}>{error}</p>}
      {aviso && <p role="status" className="text-[13px]" style={{ color: 'var(--success)' }}>{aviso}</p>}
      <p className="text-[13px]" style={{ color: 'var(--muted)' }}>
        Toca a cada hermano que vino. Al día siguiente la lista se cierra sola y los que no fueron marcados pasan a “Faltaron”.
      </p>
    </div>
  )
}
