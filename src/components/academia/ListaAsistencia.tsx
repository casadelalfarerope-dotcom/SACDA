'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, UserCheck } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { marcarAsistencia, marcarRestantesPresentes } from '@/app/actions/academia'

type Estado = 'presente' | 'ausente' | 'recuperada'
export interface AlumnoAsistencia { id: string; nombre: string; foto: string | null; estado?: Estado; nota?: string | null }

// Lista para pasar asistencia: cada alumno con un selector Presente / Ausente
// que muestra claramente lo marcado, un resumen y "marcar a los demás".
export default function ListaAsistencia({ sesionId, alumnos, habilitada }: { sesionId: string; alumnos: AlumnoAsistencia[]; habilitada: boolean }) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [estados, setEstados] = useState<Record<string, Estado | undefined>>(Object.fromEntries(alumnos.map((a) => [a.id, a.estado])))
  const [error, setError] = useState('')

  const cuenta = (e: Estado) => alumnos.filter((a) => estados[a.id] === e).length
  const sinMarcar = alumnos.filter((a) => !estados[a.id]).length

  function marcar(id: string, estado: 'presente' | 'ausente') {
    const antes = estados[id]
    setEstados((s) => ({ ...s, [id]: estado }))
    setError('')
    iniciar(async () => {
      const res = await marcarAsistencia(sesionId, id, estado)
      if ('error' in res) { setEstados((s) => ({ ...s, [id]: antes })); setError(res.error) }
      else router.refresh()
    })
  }

  function marcarRestantes() {
    setError('')
    const antes = estados
    setEstados((s) => Object.fromEntries(alumnos.map((a) => [a.id, s[a.id] ?? 'presente'])))
    iniciar(async () => {
      const res = await marcarRestantesPresentes(sesionId)
      if ('error' in res) { setEstados(antes); setError(res.error) }
      else router.refresh()
    })
  }

  if (!alumnos.length) return <p className="text-sm" style={{ color: 'var(--muted)' }}>No hay alumnos inscritos.</p>

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[14px]" role="status" style={{ color: 'var(--foreground)' }}>
          <b style={{ color: 'var(--success)' }}>{cuenta('presente')}</b> presentes ·{' '}
          <b style={{ color: 'var(--destructive)' }}>{cuenta('ausente')}</b> ausentes
          {cuenta('recuperada') > 0 && <> · <b>{cuenta('recuperada')}</b> recuperadas</>}
          {sinMarcar > 0 && <span style={{ color: 'var(--muted)' }}> · {sinMarcar} sin marcar</span>}
        </p>
        {habilitada && sinMarcar > 0 && (
          <Button size="sm" variant="secondary" disabled={pendiente} onClick={marcarRestantes}>
            <UserCheck size={14} aria-hidden="true" /> Marcar a los demás como presentes
          </Button>
        )}
      </div>

      <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
        {alumnos.map((a) => {
          const estado = estados[a.id]
          return (
            <li key={a.id} className="py-3 flex flex-wrap items-center gap-3" style={{ borderColor: 'var(--border)' }}>
              <Avatar nombre={a.nombre} fotoUrl={a.foto} size="sm" />
              <div className="flex-1 min-w-[10rem]">
                <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{a.nombre}</p>
                {a.nota && <p className="text-xs" style={{ color: 'var(--muted)' }}>{a.nota}</p>}
              </div>
              {estado === 'recuperada' ? (
                <Badge variant="info">Recuperada (0.5)</Badge>
              ) : (
                <div role="radiogroup" aria-label={`Asistencia de ${a.nombre}`} className="inline-flex p-0.5 rounded-[10px] gap-0.5" style={{ background: 'var(--fill)' }}>
                  {(['presente', 'ausente'] as const).map((op) => {
                    const sel = estado === op
                    const color = op === 'presente' ? 'var(--success)' : 'var(--destructive)'
                    return (
                      <button key={op} type="button" role="radio" aria-checked={sel} disabled={!habilitada}
                        onClick={() => !sel && marcar(a.id, op)}
                        className="inline-flex items-center gap-1 h-8 px-3 rounded-[8px] text-[13px] font-semibold transition-all disabled:opacity-50"
                        style={{
                          background: sel ? color : 'transparent',
                          color: sel ? '#fff' : 'var(--foreground)',
                          opacity: sel || !estado ? 1 : 0.6,
                        }}>
                        {sel && <Check size={14} aria-hidden="true" />}
                        {op === 'presente' ? 'Presente' : 'Ausente'}
                      </button>
                    )
                  })}
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {error && <p role="alert" className="text-[13px]" style={{ color: 'var(--error)' }}>{error}</p>}
    </div>
  )
}
