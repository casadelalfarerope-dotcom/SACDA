import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Cake, UserPlus, UserX, Users, Shield } from 'lucide-react'
import { diasParaCumpleanios, formatDateShort } from '@/lib/utils'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import { procesarCumpleaniosProximos } from '@/app/actions/notificaciones-auto'

function StatCard({ label, value, icon: Icon, href }: {
  label: string; value: number | string; icon: React.ElementType; href: string
}) {
  return (
    <Link href={href}
      className="rounded-2xl border p-4 flex items-center gap-4 transition-all hover:shadow-sm active:scale-[0.99]"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: 'var(--accent)20' }}>
        <Icon size={20} style={{ color: 'var(--accent)' }} />
      </div>
      <div>
        <p className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{value}</p>
        <p className="text-xs" style={{ color: 'var(--muted)' }}>{label}</p>
      </div>
    </Link>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const [
    { count: totalPersonas },
    { count: totalActivos },
    { count: ausenciasPendientes },
    { count: visitasPendientes },
    { data: personas },
  ] = await Promise.all([
    supabase.from('personas').select('*', { count: 'exact', head: true }),
    supabase.from('personas').select('*', { count: 'exact', head: true }).eq('estado', 'activo'),
    supabase.from('ausencias').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente'),
    supabase.from('seguimiento_visitas').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente'),
    supabase.from('personas').select('id, nombre_completo, foto_url, fecha_nacimiento, ministerio')
      .eq('estado', 'activo').not('fecha_nacimiento', 'is', null),
  ])

  // Disparar notificaciones de cumpleaños de forma no bloqueante
  procesarCumpleaniosProximos().catch(console.error)

  const hoy = new Date()
  const cumpleHoy = (personas ?? [])
    .filter((p) => {
      const nac = new Date(p.fecha_nacimiento!)
      return nac.getMonth() === hoy.getMonth() && nac.getDate() === hoy.getDate()
    })

  const cumpleProximos = (personas ?? [])
    .map((p) => ({ ...p, dias: diasParaCumpleanios(p.fecha_nacimiento!) }))
    .filter((p) => p.dias > 0 && p.dias <= 7)
    .sort((a, b) => a.dias - b.dias)
    .slice(0, 5)

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Saludo */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
          Bienvenido
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
          {hoy.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Cumpleaños de hoy */}
      {cumpleHoy.length > 0 && (
        <div className="rounded-2xl border px-5 py-4"
          style={{ background: '#34c75910', borderColor: '#34c75940' }}>
          <div className="flex items-center gap-2 mb-3">
            <Cake size={18} style={{ color: 'var(--success)' }} />
            <p className="font-semibold text-sm" style={{ color: 'var(--success)' }}>
              Cumpleaños hoy
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {cumpleHoy.map((p) => (
              <Link key={p.id} href={`/congregantes/${p.id}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                style={{ background: 'var(--surface)' }}>
                <Avatar nombre={p.nombre_completo} size="sm" />
                <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                  {p.nombre_completo.split(' ')[0]}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total registrados" value={totalPersonas ?? 0} icon={Users} href="/congregantes" />
        <StatCard label="Miembros activos" value={totalActivos ?? 0} icon={Users} href="/congregantes?estado=activo" />
        <StatCard label="Ausencias pendientes" value={ausenciasPendientes ?? 0} icon={UserX} href="/miembros" />
        <StatCard label="Visitas en seguimiento" value={visitasPendientes ?? 0} icon={UserPlus} href="/miembros" />
      </div>

      {/* Próximos cumpleaños (7 días) */}
      {cumpleProximos.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Cake size={18} style={{ color: 'var(--accent)' }} />
              <h2 className="font-semibold" style={{ color: 'var(--foreground)' }}>
                Cumpleaños esta semana
              </h2>
            </div>
            <Link href="/miembros" className="text-xs" style={{ color: 'var(--accent)' }}>
              Ver todos
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {cumpleProximos.map((p) => (
              <Link key={p.id} href={`/congregantes/${p.id}`}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all hover:shadow-sm"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <Avatar nombre={p.nombre_completo} fotoUrl={p.foto_url} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                    {p.nombre_completo}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>
                    {p.ministerio ?? 'Sin ministerio'}
                  </p>
                </div>
                <span className="text-xs font-semibold px-2 py-1 rounded-lg"
                  style={{ background: 'var(--surface-secondary)', color: 'var(--muted)' }}>
                  {p.dias}d
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Accesos rápidos */}
      <section>
        <h2 className="font-semibold mb-3" style={{ color: 'var(--foreground)' }}>
          Acciones rápidas
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { href: '/congregantes/nuevo', label: 'Nuevo congregante', icon: Users },
            { href: '/miembros/visitas/nueva', label: 'Registrar visita', icon: UserPlus },
            { href: '/miembros/ausencias/nueva', label: 'Registrar ausencia', icon: UserX },
            { href: '/miembros/ceremonias/nueva', label: 'Registrar ceremonia', icon: Cake },
            { href: '/roles', label: 'Gestionar roles', icon: Shield },
          ].map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className="rounded-2xl border p-4 flex flex-col items-center gap-2 text-center transition-all hover:shadow-sm active:scale-[0.99]"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--surface-secondary)' }}>
                <Icon size={20} style={{ color: 'var(--accent)' }} />
              </div>
              <span className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>
                {label}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
