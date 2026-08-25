import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Bell, CheckCheck } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import MarcarLeidasBtn from '@/components/MarcarLeidasBtn'

const TIPO_ICONO: Record<string, string> = {
  turno_asignado: '📋',
  cumpleanios: '🎂',
  ausencia: '⚠️',
  reunion_grupo: '👥',
  tarea_diseno: '🎨',
  mantenimiento: '🔧',
  solicitud_venta: '🛍️',
  general: '🔔',
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
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell size={22} style={{ color: 'var(--accent)' }} />
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
              Notificaciones
            </h1>
            {sinLeer > 0 && (
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                {sinLeer} sin leer
              </p>
            )}
          </div>
        </div>
        {sinLeer > 0 && (
          <MarcarLeidasBtn personaId={cuenta.persona_id} />
        )}
      </div>

      {!notifs || notifs.length === 0 ? (
        <div className="rounded-2xl border p-12 text-center"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <Bell size={32} className="mx-auto mb-3" style={{ color: 'var(--muted)' }} />
          <p className="font-medium" style={{ color: 'var(--foreground)' }}>Sin notificaciones</p>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            Aquí aparecerán tus avisos del sistema.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifs.map((n) => (
            <div key={n.id}
              className="flex items-start gap-4 px-4 py-4 rounded-2xl border transition-all"
              style={{
                background: n.leida ? 'var(--surface)' : 'var(--accent)08',
                borderColor: n.leida ? 'var(--border)' : 'var(--accent)30',
              }}>
              <span className="text-xl flex-shrink-0 mt-0.5">
                {TIPO_ICONO[n.tipo] ?? '🔔'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                  {n.titulo}
                </p>
                {n.cuerpo && (
                  <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>{n.cuerpo}</p>
                )}
                <p className="text-xs mt-1.5" style={{ color: 'var(--muted)' }}>
                  {formatDate(n.created_at)}
                </p>
              </div>
              {!n.leida && (
                <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                  style={{ background: 'var(--accent)' }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
