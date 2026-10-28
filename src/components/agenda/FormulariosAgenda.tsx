'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Search } from 'lucide-react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Avatar from '@/components/ui/Avatar'
import { Segmentado } from '@/components/ui/ios'
import CamposModalidad, { MODALIDAD_INICIAL } from '@/components/calendario/CamposModalidad'
import { DIAS_SEMANA } from '@/lib/agenda'
import { crearEventoMinisterio, cancelarReunion, eliminarEventoMinisterio, marcarAsistenciaMinisterio } from '@/app/actions/agenda'

const caja = 'rounded-2xl border p-4 space-y-4'
const estiloCaja = { background: 'var(--surface)', borderColor: 'var(--border)' }

// Nuevo evento del ministerio: una vez o cada semana, con o sin lista.
export function NuevoEventoMinisterio({ grupoId, hoy }: { grupoId: string; hoy: string }) {
  const router = useRouter()
  const vacio = { titulo: '', lugar: '', descripcion: '', hora_inicio: '', hora_fin: '', fecha: hoy, desde: hoy, hasta: '' }
  const [datos, setDatos] = useState(vacio)
  const [repetir, setRepetir] = useState<'una' | 'semanal'>('una')
  const [dias, setDias] = useState<string[]>([])
  const [lista, setLista] = useState(true)
  const [mod, setMod] = useState(MODALIDAD_INICIAL)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [pendiente, iniciar] = useTransition()
  const campo = (k: keyof typeof vacio) => ({ value: datos[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setDatos({ ...datos, [k]: e.target.value }) })

  return (
    <form noValidate className={caja} style={estiloCaja} onSubmit={(e) => {
      e.preventDefault(); setError(''); setAviso('')
      iniciar(async () => {
        const res = await crearEventoMinisterio({
          grupo_id: grupoId, titulo: datos.titulo, lugar: datos.lugar, descripcion: datos.descripcion,
          hora_inicio: datos.hora_inicio, hora_fin: datos.hora_fin, repetir: repetir === 'semanal',
          fecha: datos.fecha, dias_semana: dias, desde: datos.desde, hasta: datos.hasta, requiere_asistencia: lista, ...mod,
        })
        if (res.error) { setError(res.error); return }
        setAviso('Evento creado. Se avisó a los integrantes.')
        setDatos(vacio); setDias([]); setMod(MODALIDAD_INICIAL)
        router.refresh()
      })
    }}>
      <Input label="¿Qué es? *" {...campo('titulo')} placeholder="Ej. Ensayo de la banda, Devocional" />
      <Segmentado etiqueta="¿Se repite?" ancho valor={repetir} onChange={setRepetir}
        opciones={[{ valor: 'una', texto: 'Una sola vez' }, { valor: 'semanal', texto: 'Cada semana' }]} />
      {repetir === 'una' ? (
        <Input label="Fecha *" type="date" {...campo('fecha')} />
      ) : (
        <>
          <fieldset>
            <legend className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Días *</legend>
            <div className="flex flex-wrap gap-1.5">
              {DIAS_SEMANA.map((d) => {
                const activo = dias.includes(d.valor)
                return (
                  <button key={d.valor} type="button" aria-pressed={activo}
                    onClick={() => setDias(activo ? dias.filter((x) => x !== d.valor) : [...dias, d.valor])}
                    className="h-9 min-w-[44px] px-3 rounded-full text-[14px] font-medium"
                    style={activo ? { background: 'var(--accent)', color: 'var(--accent-foreground)' } : { color: 'var(--foreground)', boxShadow: 'inset 0 0 0 1.5px var(--border)' }}>
                    {d.texto}
                  </button>
                )
              })}
            </div>
          </fieldset>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Desde *" type="date" {...campo('desde')} />
            <Input label="Hasta (opcional)" type="date" {...campo('hasta')} />
          </div>
        </>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Input label="Hora de inicio" type="time" {...campo('hora_inicio')} />
        <Input label="Hora de fin" type="time" {...campo('hora_fin')} />
      </div>
      <Input label="Lugar (opcional)" {...campo('lugar')} placeholder="Ej. Templo, casa de la hna. Rosa" />
      <CamposModalidad valor={mod} onChange={setMod} />
      <Input label="Detalle (opcional)" {...campo('descripcion')} placeholder="Ej. Traer la Biblia" />
      <label className="flex items-start gap-2.5 text-[14px]" style={{ color: 'var(--foreground)' }}>
        <input type="checkbox" checked={lista} onChange={(e) => setLista(e.target.checked)} className="mt-1" />
        <span>Pasar lista<span className="block text-[13px]" style={{ color: 'var(--muted)' }}>Podrás marcar quién vino y ver quién falta seguido.</span></span>
      </label>
      {error && <p role="alert" className="text-[13px]" style={{ color: 'var(--error)' }}>{error}</p>}
      {aviso && <p role="status" className="text-[13px]" style={{ color: 'var(--success)' }}>{aviso}</p>}
      <Button type="submit" loading={pendiente}>Crear evento</Button>
    </form>
  )
}

// Cancelar esta fecha / eliminar el evento completo.
export function AccionesReunion({ eventoId, fecha, recurrente }: { eventoId: string; fecha: string; recurrente: boolean }) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const ejecutar = (fn: () => Promise<{ error?: string }>) => iniciar(async () => {
    const res = await fn()
    if (res.error) alert(res.error); else router.refresh()
  })
  return (
    <span className="flex flex-wrap gap-3 mt-1.5">
      <button type="button" disabled={pendiente} className="text-[13px]" style={{ color: 'var(--muted)' }}
        onClick={() => confirm(recurrente ? '¿Cancelar solo esta fecha? Las demás siguen igual.' : '¿Cancelar este evento?') && ejecutar(() => cancelarReunion(eventoId, fecha))}>
        {recurrente ? 'Cancelar esta fecha' : 'Cancelar evento'}
      </button>
      {recurrente && (
        <button type="button" disabled={pendiente} className="text-[13px]" style={{ color: 'var(--error)' }}
          onClick={() => confirm('¿Eliminar el evento y todas sus fechas? Se borrará también su asistencia.') && ejecutar(() => eliminarEventoMinisterio(eventoId))}>
          Eliminar todas las fechas
        </button>
      )}
    </span>
  )
}

const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Pasar lista con los integrantes del ministerio.
export function ListaMinisterio({ eventoId, fecha, personas, presentesIniciales }: {
  eventoId: string; fecha: string
  personas: { id: string; nombre_completo: string; foto_url: string | null }[]
  presentesIniciales: string[]
}) {
  const [presentes, setPresentes] = useState(() => new Set(presentesIniciales))
  const [busqueda, setBusqueda] = useState('')
  const [error, setError] = useState('')
  const [, iniciar] = useTransition()
  const visibles = useMemo(() => {
    const q = normalizar(busqueda.trim())
    return personas.filter((p) => !q || normalizar(p.nombre_completo).includes(q))
  }, [personas, busqueda])

  function alternar(id: string) {
    const vino = !presentes.has(id)
    setPresentes((s) => { const n = new Set(s); if (vino) n.add(id); else n.delete(id); return n })
    setError('')
    iniciar(async () => {
      const res = await marcarAsistenciaMinisterio(eventoId, fecha, id, vino)
      if (res.error) {
        setError(res.error)
        setPresentes((s) => { const n = new Set(s); if (vino) n.delete(id); else n.add(id); return n })
      }
    })
  }

  return (
    <div className="space-y-3">
      <p role="status" className="text-[15px]" style={{ color: 'var(--foreground)' }}>
        <b className="text-[22px] tabular-nums" style={{ color: 'var(--success)' }}>{presentes.size}</b>
        <span style={{ color: 'var(--muted)' }}> de {personas.length} {presentes.size === 1 ? 'vino' : 'vinieron'}</span>
      </p>
      {personas.length > 8 && (
        <label className="relative block">
          <span className="sr-only">Buscar integrante</span>
          <Search size={17} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre…" type="search"
            className="w-full h-11 pl-10 pr-3 rounded-[10px] text-[16px] outline-none border border-transparent" style={{ background: 'var(--fill)', color: 'var(--foreground)' }} />
        </label>
      )}
      <ul className="rounded-2xl border overflow-hidden" style={estiloCaja}>
        {visibles.map((p, i) => {
          const vino = presentes.has(p.id)
          return (
            <li key={p.id} className={i ? 'border-t' : ''} style={{ borderColor: 'var(--border)' }}>
              <button type="button" onClick={() => alternar(p.id)} aria-pressed={vino}
                className="w-full flex items-center gap-3 px-4 min-h-[56px] text-left transition-colors hover:bg-[color:var(--fill)]">
                <Avatar nombre={p.nombre_completo} fotoUrl={p.foto_url} size="sm" />
                <span className="flex-1 min-w-0 text-[15px] truncate" style={{ color: 'var(--foreground)', fontWeight: vino ? 600 : 450 }}>{p.nombre_completo}</span>
                <span className="inline-flex items-center gap-1 h-8 px-3 rounded-full text-[13px] font-semibold flex-shrink-0"
                  style={vino ? { background: 'var(--success)', color: '#fff' } : { color: 'var(--muted)', boxShadow: 'inset 0 0 0 1.5px var(--border)' }}>
                  {vino ? <><Check size={14} aria-hidden="true" /> Vino</> : 'No vino'}
                </span>
              </button>
            </li>
          )
        })}
        {!personas.length && <li className="px-4 py-4 text-[15px]" style={{ color: 'var(--muted)' }}>El ministerio aún no tiene integrantes.</li>}
      </ul>
      {error && <p role="alert" className="text-[13px]" style={{ color: 'var(--error)' }}>{error}</p>}
      <p className="text-[13px]" style={{ color: 'var(--muted)' }}>Toca a cada integrante que vino. Se guarda solo.</p>
    </div>
  )
}
