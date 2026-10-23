import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { contextoEspacio, enlaceEspacio } from '@/lib/espacio'
import MarcarLeidasBtn from '@/components/MarcarLeidasBtn'
import { formatDate } from '@/lib/utils'
import { IconoModulo } from '@/components/ui/IconoApp'
import { Pagina, Grupo, Fila, Vacio } from '@/components/ui/ios'

export default async function AvisosPage() {
  const ctx = await contextoEspacio()
  const supabase = await createClient()
  const { data: avisos } = await supabase.from('notificaciones').select('id, titulo, cuerpo, url, leida, created_at')
    .eq('persona_id', ctx.personaId).order('created_at', { ascending: false }).limit(50)
  const sinLeer = (avisos ?? []).filter((a) => !a.leida).length

  return (
    <Pagina ancho="estrecho" titulo="Avisos" subtitulo={sinLeer > 0 ? `${sinLeer} sin leer` : 'Estás al día'}
      acciones={sinLeer > 0 ? <MarcarLeidasBtn personaId={ctx.personaId} /> : undefined}>
      {!avisos?.length ? (
        <Vacio icono={<Bell size={44} />} titulo="No tienes avisos" />
      ) : (
        <Grupo>
          {avisos.map((a, i) => (
            <Fila key={a.id} primero={i === 0} href={ctx.tienePanel ? (a.url ?? undefined) : enlaceEspacio(a.url)}
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
