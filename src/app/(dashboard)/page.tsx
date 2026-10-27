import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Cake, ChevronRight, UserPlus, UserX, Users, UserCheck, Church, CalendarPlus, type LucideIcon } from 'lucide-react'
import { diasParaCumpleanios } from '@/lib/utils'
import Avatar from '@/components/ui/Avatar'
import { IconoModulo } from '@/components/ui/IconoApp'
import { procesarCumpleaniosProximos } from '@/app/actions/notificaciones-auto'

function Widget({ label, value, icon, color, href }: {
  label: string; value: number; icon: LucideIcon; color: string; href: string
}) {
  return (
    <Link href={href}
      className="rounded-2xl border p-4 flex flex-col gap-3 transition-transform active:scale-[0.98] hover:brightness-[0.98]"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <IconoModulo icon={icon} color={color} tamano={30} />
      <div>
        <p className="text-[30px] leading-none font-bold tabular-nums tracking-tight" style={{ color: 'var(--foreground)' }}>{value}</p>
        <p className="text-[13px] mt-1.5 font-medium" style={{ color: 'var(--muted)' }}>{label}</p>
      </div>
    </Link>
  )
}

const ATAJOS: { href: string; label: string; icon: LucideIcon; desde: string; hasta: string }[] = [
  { href: '/congregantes/nuevo',        label: 'Nuevo congregante',   icon: Users,        desde: '#ff9f0a', hasta: '#c45500' },
  { href: '/miembros',                  label: 'Pasar lista',         icon: UserPlus,     desde: '#30b0c7', hasta: '#0b6e80' },
  { href: '/miembros/ausencias',        label: 'Ver quiénes faltaron', icon: UserX,       desde: '#ff375f', hasta: '#c1123d' },
  { href: '/miembros/ceremonias/nueva', label: 'Registrar ceremonia', icon: Church,       desde: '#7d7aff', hasta: '#4a47c4' },
  { href: '/calendario/nuevo',          label: 'Nuevo evento',        icon: CalendarPlus, desde: '#ff6259', hasta: '#c62a20' },
]

function saludo() {
  const hora = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Lima' }).format(new Date()))
  return hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { count: totalPersonas },
    { count: totalActivos },
    { count: ausenciasPendientes },
    { count: visitasPendientes },
    { data: personas },
    { data: cuenta },
  ] = await Promise.all([
    supabase.from('personas').select('*', { count: 'exact', head: true }),
    supabase.from('personas').select('*', { count: 'exact', head: true }).eq('estado', 'activo'),
    supabase.from('ausencias').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente'),
    supabase.from('seguimiento_visitas').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente'),
    supabase.from('personas').select('id, nombre_completo, foto_url, fecha_nacimiento, ministerio')
      .eq('estado', 'activo').not('fecha_nacimiento', 'is', null),
    user ? supabase.from('cuentas').select('persona:personas(nombre_completo)').eq('id', user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  procesarCumpleaniosProximos().catch(console.error)

  const nombre = (cuenta?.persona as unknown as { nombre_completo: string } | null)?.nombre_completo.split(' ')[0]
  const fecha = new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Lima' }).format(new Date())

  const cumpleanios = (personas ?? [])
    .map((p) => ({ ...p, dias: diasParaCumpleanios(p.fecha_nacimiento!) }))
    .filter((p) => p.dias >= 0 && p.dias <= 7)
    .sort((a, b) => a.dias - b.dias)
    .slice(0, 6)

  return (
    <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto space-y-8">
      <header>
        <p className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>{fecha}</p>
        <h1 className="mt-1" style={{ color: 'var(--foreground)' }}>{saludo()}{nombre ? `, ${nombre}` : ''}</h1>
      </header>

      <section aria-label="Resumen" className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Widget label="Registrados" value={totalPersonas ?? 0} icon={Users} color="#ff9500" href="/congregantes" />
        <Widget label="Miembros activos" value={totalActivos ?? 0} icon={UserCheck} color="#34c759" href="/congregantes?estado=activo" />
        <Widget label="Faltaron · por contactar" value={ausenciasPendientes ?? 0} icon={UserX} color="#ff2d55" href="/miembros/ausencias" />
        <Widget label="Nuevos en seguimiento" value={visitasPendientes ?? 0} icon={UserPlus} color="#30b0c7" href="/miembros/visitas" />
      </section>

      {cumpleanios.length > 0 && (
        <section aria-labelledby="cumple-t">
          <div className="flex items-end justify-between mb-2 px-1">
            <h2 id="cumple-t" className="text-[20px] font-bold" style={{ color: 'var(--foreground)' }}>Cumpleaños de la semana</h2>
            <Link href="/miembros" className="text-[15px]" style={{ color: 'var(--accent)' }}>Ver todos</Link>
          </div>
          <ul className="rounded-2xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            {cumpleanios.map((p, i) => (
              <li key={p.id}>
                <Link href={`/congregantes/${p.id}`} className="flex items-center gap-3 pl-4 hover:bg-[color:var(--fill)] transition-colors">
                  <Avatar nombre={p.nombre_completo} fotoUrl={p.foto_url} size="sm" />
                  <div className={`flex-1 min-w-0 flex items-center gap-3 py-3 pr-4 ${i ? 'border-t' : ''}`} style={{ borderColor: 'var(--border)' }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-medium truncate" style={{ color: 'var(--foreground)' }}>{p.nombre_completo}</p>
                      <p className="text-[13px] truncate" style={{ color: 'var(--muted)' }}>{p.ministerio ?? 'Sin ministerio'}</p>
                    </div>
                    {p.dias === 0 ? (
                      <span className="inline-flex items-center gap-1 text-[13px] font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: 'color-mix(in srgb, #ff9500 16%, transparent)', color: 'var(--warning)' }}>
                        <Cake size={14} aria-hidden="true" /> Hoy
                      </span>
                    ) : (
                      <span className="text-[15px] tabular-nums" style={{ color: 'var(--muted)' }}>
                        {p.dias === 1 ? 'Mañana' : `En ${p.dias} días`}
                      </span>
                    )}
                    <ChevronRight size={16} aria-hidden="true" style={{ color: 'var(--muted)', opacity: 0.6 }} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="atajos-t">
        <h2 id="atajos-t" className="text-[20px] font-bold mb-2 px-1" style={{ color: 'var(--foreground)' }}>Accesos rápidos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {ATAJOS.map(({ href, label, icon: Icon, desde, hasta }) => (
            <Link key={href} href={href}
              className="rounded-2xl p-4 h-28 flex flex-col justify-between text-white transition-transform active:scale-[0.97] hover:brightness-105"
              style={{ background: `linear-gradient(160deg, ${desde}, ${hasta})`, boxShadow: 'var(--shadow-card)' }}>
              <Icon size={24} aria-hidden="true" strokeWidth={2.2} />
              <span className="text-[14px] font-semibold leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
