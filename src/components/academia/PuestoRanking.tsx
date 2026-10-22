import { Trophy, Medal } from 'lucide-react'

// El alumno solo ve su propio puesto, nunca el de los demás.
export default function PuestoRanking({ puesto, promedio }: { puesto: number; promedio: number | null }) {
  if (promedio == null) {
    return <p className="text-xs" style={{ color: 'var(--muted)' }}>Tu puesto aparecerá cuando tengas tu primera nota.</p>
  }
  const top = puesto <= 3
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl"
      style={{ background: top ? 'color-mix(in srgb, var(--warning) 14%, var(--surface))' : 'var(--surface-secondary)' }}>
      {top
        ? <Trophy size={22} aria-hidden="true" style={{ color: 'var(--warning)' }} />
        : <Medal size={22} aria-hidden="true" style={{ color: 'var(--muted)' }} />}
      <div>
        <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
          {top ? '¡Estás en el Top 3!' : `Estás en el puesto ${puesto}`}
        </p>
        <p className="text-xs" style={{ color: 'var(--muted)' }}>{top ? `Puesto ${puesto} · ` : ''}Promedio: {promedio}/20</p>
      </div>
    </div>
  )
}
