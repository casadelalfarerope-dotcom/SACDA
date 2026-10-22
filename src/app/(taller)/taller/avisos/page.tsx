import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { personaActual } from '@/lib/academia/servidor'
import MarcarLeidasBtn from '@/components/MarcarLeidasBtn'
import { formatDate } from '@/lib/utils'

export default async function AvisosPage() {
  const yo = await personaActual()
  if (!yo) return null
  const supabase = await createClient()
  const { data: avisos } = await supabase.from('notificaciones').select('id, titulo, cuerpo, url, leida, created_at')
    .eq('persona_id', yo.personaId).order('created_at', { ascending: false }).limit(50)
  const sinLeer = (avisos ?? []).filter((a) => !a.leida).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Avisos</h1>
        {sinLeer > 0 && <MarcarLeidasBtn personaId={yo.personaId} />}
      </div>
      {!avisos?.length && <p className="text-sm py-10 text-center" style={{ color: 'var(--muted)' }}>No tienes avisos.</p>}
      <ul className="space-y-2">
        {avisos?.map((a) => {
          const contenido = (
            <>
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                {!a.leida && <span className="sr-only">Sin leer: </span>}{a.titulo}
              </p>
              {a.cuerpo && <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>{a.cuerpo}</p>}
              <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{formatDate(a.created_at, { time: true })}</p>
            </>
          )
          const estilo = {
            background: a.leida ? 'var(--surface)' : 'color-mix(in srgb, var(--accent) 6%, var(--surface))',
            borderColor: a.leida ? 'var(--border)' : 'color-mix(in srgb, var(--accent) 30%, var(--border))',
          }
          return (
            <li key={a.id}>
              {a.url?.startsWith('/taller')
                ? <Link href={a.url} className="block p-4 rounded-2xl border hover:opacity-80" style={estilo}>{contenido}</Link>
                : <div className="p-4 rounded-2xl border" style={estilo}>{contenido}</div>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
