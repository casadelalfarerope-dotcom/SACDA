'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { inscribirAlumnos } from '@/app/actions/academia'
import Button from '@/components/ui/Button'

export default function InscribirAlumnos({ cursoId, personas }: {
  cursoId: string
  personas: { id: string; nombre_completo: string; dni: string | null }[]
}) {
  const router = useRouter()
  const [busqueda, setBusqueda] = useState('')
  const [elegidos, setElegidos] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  const q = busqueda.trim().toLowerCase()
  const visibles = personas.filter((p) => !q || p.nombre_completo.toLowerCase().includes(q) || p.dni?.includes(q))

  function alternar(id: string) {
    setElegidos((prev) => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id)
      else s.add(id)
      return s
    })
  }

  function inscribir() {
    setError('')
    startTransition(async () => {
      const res = await inscribirAlumnos(cursoId, [...elegidos])
      if ('error' in res) { setError(res.error); return }
      setElegidos(new Set())
      router.refresh()
    })
  }

  if (!personas.length) return <p className="text-sm" style={{ color: 'var(--muted)' }}>Todos los congregantes activos ya están inscritos.</p>

  return (
    <div className="space-y-3">
      <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
        aria-label="Buscar congregante por nombre o DNI" placeholder="Buscar por nombre o DNI…"
        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none border border-[color:var(--border)] focus:border-[color:var(--accent)]"
        style={{ background: 'var(--surface)', color: 'var(--foreground)' }} />
      <fieldset className="max-h-64 overflow-y-auto rounded-xl border divide-y"
        style={{ borderColor: 'var(--border)' }}>
        <legend className="sr-only">Congregantes para inscribir</legend>
        {visibles.map((p) => (
          <label key={p.id} className="flex items-center gap-3 px-3 py-2.5 text-sm cursor-pointer"
            style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
            <input type="checkbox" checked={elegidos.has(p.id)} onChange={() => alternar(p.id)} className="w-4 h-4" />
            <span className="flex-1">{p.nombre_completo}</span>
            {p.dni && <span className="text-xs" style={{ color: 'var(--muted)' }}>{p.dni}</span>}
          </label>
        ))}
        {!visibles.length && <p className="px-3 py-3 text-sm" style={{ color: 'var(--muted)' }}>Sin resultados.</p>}
      </fieldset>
      {error && <p role="alert" className="text-sm" style={{ color: 'var(--error)' }}>{error}</p>}
      <Button type="button" onClick={inscribir} loading={pending} disabled={!elegidos.size}>
        Inscribir {elegidos.size ? `(${elegidos.size})` : ''}
      </Button>
    </div>
  )
}
