import { createClient } from '@/lib/supabase/server'
import { Settings, Bell, Mail, Globe } from 'lucide-react'
import PreferenciasForm from './PreferenciasForm'

export default async function ConfiguracionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: cuenta } = user
    ? await supabase.from('cuentas').select('*, persona:personas(nombre_completo, email)').eq('id', user.id).single()
    : { data: null }

  const persona = cuenta?.persona as { nombre_completo: string; email: string | null } | null

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Settings size={22} style={{ color: 'var(--accent)' }} />
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Configuración</h1>
          {persona && (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>{persona.nombre_completo}</p>
          )}
        </div>
      </div>

      {/* Cuenta */}
      <section className="p-5 rounded-2xl border space-y-3"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 mb-1">
          <Globe size={16} style={{ color: 'var(--accent)' }} />
          <h2 className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>Cuenta</h2>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-xs w-32 flex-shrink-0 pt-0.5" style={{ color: 'var(--muted)' }}>Correo</span>
          <span className="text-sm" style={{ color: 'var(--foreground)' }}>{user?.email ?? '—'}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-xs w-32 flex-shrink-0 pt-0.5" style={{ color: 'var(--muted)' }}>Nombre</span>
          <span className="text-sm" style={{ color: 'var(--foreground)' }}>{persona?.nombre_completo ?? '—'}</span>
        </div>
        <p className="text-xs pt-1" style={{ color: 'var(--muted)' }}>
          Para cambiar tu correo o contraseña, contacta a un administrador.
        </p>
      </section>

      {/* Notificaciones */}
      <section className="p-5 rounded-2xl border space-y-4"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 mb-1">
          <Bell size={16} style={{ color: 'var(--accent)' }} />
          <h2 className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>Notificaciones</h2>
        </div>
        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          Las notificaciones in-app están siempre activas. El canal de email se activa cuando configures un correo.
        </p>

        <div className="rounded-xl p-3 flex items-center gap-3"
          style={{ background: 'var(--surface-secondary)', border: '1px solid var(--border)' }}>
          <Bell size={16} style={{ color: 'var(--accent)' }} />
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>In-app</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>Campana en la barra superior</p>
          </div>
          <span className="text-xs px-2 py-1 rounded-full font-medium"
            style={{ background: '#34c75920', color: '#16a34a' }}>Activo</span>
        </div>

        <div className="rounded-xl p-3 flex items-center gap-3"
          style={{ background: 'var(--surface-secondary)', border: '1px solid var(--border)' }}>
          <Mail size={16} style={{ color: 'var(--muted)' }} />
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Email</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              {persona?.email ?? 'Sin correo configurado en tu ficha de congregante'}
            </p>
          </div>
          <span className="text-xs px-2 py-1 rounded-full font-medium"
            style={{
              background: persona?.email ? '#34c75920' : 'var(--surface)',
              color: persona?.email ? '#16a34a' : 'var(--muted)',
              border: persona?.email ? 'none' : '1px solid var(--border)',
            }}>
            {persona?.email ? 'Activo' : 'Inactivo'}
          </span>
        </div>
      </section>

      {/* Preferencias de visualización */}
      <section className="p-5 rounded-2xl border"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Settings size={16} style={{ color: 'var(--accent)' }} />
          <h2 className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>Apariencia</h2>
        </div>
        <PreferenciasForm />
      </section>
    </div>
  )
}
