import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Bell, Mic2, Cake, ClipboardList, CheckCircle2, Undo2, Image, UserX, Users, Palette, Wrench, ShoppingBag, type LucideIcon } from 'lucide-react'
import { IconoModulo } from '@/components/ui/IconoApp'
import { Pagina, Grupo, Fila, Vacio } from '@/components/ui/ios'
import { formatDate } from '@/lib/utils'
import MarcarLeidasBtn from '@/components/MarcarLeidasBtn'

const TIPO: Record<string, { icon: LucideIcon; color: string }> = {
  turno_asignado:      { icon: Mic2,          color: '#ff2d55' },
  cumpleanios:         { icon: Cake,          color: '#ff9500' },
  cumpleanios_proximo: { icon: Cake,          color: '#ff9500' },
  tarea_asignada:      { icon: ClipboardList, color: '#a35d2d' },
  tarea_aprobada:      { icon: CheckCircle2,  color: '#34c759' },
  tarea_rechazada:     { icon: Undo2,         color: '#ff3b30' },
  arte_distribuido:    { icon: Image,         color: '#af52de' },
  ausencia:            { icon: UserX,         color: '#ff3b30' },
  reunion_grupo:       { icon: Users,         color: '#5856d6' },
  tarea_diseno:        { icon: Palette,       color: '#ff2d55' },
  mantenimiento:       { icon: Wrench,        color: '#8e8e93' },
  solicitud_venta:     { icon: ShoppingBag,   color: '#00c7be' },
  general:             { icon: Bell,          color: '#a35d2d' },
}

export default async function NotificacionesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: cuenta } = await supabase
    .from('cuentas').select('persona_id').eq('id', user.id).single()

  if (!cuenta) redirect('/')

  const { data: notifs } = await supabase
    .from('notificaciones')
    .select('*')
    .eq('persona_id', cuenta.persona_id)
    .order('created_at', { ascending: false })
    .limit(50)

  const sinLeer = (notifs ?? []).filter((n) => !n.leida).length

  return (
    <Pagina ancho="estrecho" titulo="Notificaciones" subtitulo={sinLeer > 0 ? `${sinLeer} sin leer` : 'Estás al día'}
      acciones={sinLeer > 0 ? <MarcarLeidasBtn personaId={cuenta.persona_id} /> : undefined}>
      {!notifs?.length ? (
        <Vacio icono={<Bell size={44} />} titulo="Sin notificaciones" texto="Aquí aparecerán tus avisos del sistema." />
      ) : (
        <Grupo>
          {notifs.map((n, i) => {
            const t = TIPO[n.tipo] ?? TIPO.general!
            return (
              <Fila key={n.id} href={n.url ?? undefined} primero={i === 0}
                inicio={<IconoModulo icon={t.icon} color={t.color} tamano={36} />}
                titulo={<span style={{ fontWeight: n.leida ? 450 : 650 }}>{!n.leida && <span className="sr-only">Sin leer: </span>}{n.titulo}</span>}
                subtitulo={n.cuerpo ?? undefined}
                detalle={<span className="flex items-center gap-2 text-[13px]">
                  {formatDate(n.created_at)}
                  {!n.leida && <span className="w-2.5 h-2.5 rounded-full" aria-hidden="true" style={{ background: 'var(--accent)' }} />}
                </span>} />
            )
          })}
        </Grupo>
      )}
    </Pagina>
  )
}
