import { createClient } from '@/lib/supabase/server'
import { personaActual } from '@/lib/academia/servidor'
import MarcarLeidasBtn from '@/components/MarcarLeidasBtn'
import { formatDate } from '@/lib/utils'
import { Bell } from 'lucide-react'
import { IconoModulo } from '@/components/ui/IconoApp'
import { Pagina, Grupo, Fila, Vacio } from '@/components/ui/ios'

export default async function AvisosPage() {
  const yo = await personaActual()
  if (!yo) return null
  const supabase = await createClient()
  const { data: avisos } = await supabase.from('notificaciones').select('id, titulo, cuerpo, url, leida, created_at')
    .eq('persona_id', yo.personaId).order('created_at', { ascending: false }).limit(50)
  const sinLeer = (avisos ?? []).filter((a) => !a.leida).length

  return (
    <Pagina ancho="estrecho" titulo="Avisos" subtitulo={sinLeer > 0 ? `${sinLeer} sin leer` : 'Estás al día'} volver={{ href: '/taller', texto: 'Mi Taller' }}
      acciones={sinLeer > 0 ? <MarcarLeidasBtn personaId={yo.personaId} /> : undefined}>
      {!avisos?.length ? (
        <Vacio icono={<Bell size={44} />} titulo="No tienes avisos" />
      ) : (
        <Grupo>
          {avisos.map((a, i) => (
            <Fila key={a.id} primero={i === 0} href={a.url?.startsWith('/taller') ? a.url : undefined}
              inicio={<IconoModulo icon={Bell} color={a.leida ? '#8e8e93' : '#af52de'} tamano={36} />}
              titulo={<span style={{ fontWeight: a.leida ? 450 : 650 }}>{!a.leida && <span className="sr-only">Sin leer: </span>}{a.titulo}</span>}
              subtitulo={a.cuerpo ?? undefined}
              detalle={<span className="flex items-center gap-2 text-[13px]">
                {formatDate(a.created_at)}
                {!a.leida && <span className="w-2.5 h-2.5 rounded-full" aria-hidden="true" style={{ background: 'var(--accent)' }} />}
              </span>} />
          ))}
        </Grupo>
      )}
    </Pagina>
  )
}
