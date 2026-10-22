import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Bell, LayoutGrid } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import Avatar from '@/components/ui/Avatar'
import { IconoApp } from '@/components/ui/IconoApp'
import BotonSalir from '@/components/academia/BotonSalir'

export default async function TallerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: cuenta } = await supabase.from('cuentas')
    .select('persona_id, persona:personas(nombre_completo, foto_url)').eq('id', user.id).maybeSingle()
  const persona = cuenta?.persona as unknown as { nombre_completo: string; foto_url: string | null } | null

  const { count: sinLeer } = cuenta
    ? await supabase.from('notificaciones').select('id', { count: 'exact', head: true })
      .eq('persona_id', cuenta.persona_id).eq('leida', false)
    : { count: 0 }

  // Líderes y servidores también pueden ver el Taller: les damos un camino de vuelta al panel.
  const { data: roles } = cuenta
    ? await supabase.from('roles_asignados').select('rol:roles(nombre)').eq('persona_id', cuenta.persona_id).eq('activo', true)
    : { data: [] }
  const tienePanel = (roles ?? []).some((r) => (r.rol as unknown as { nombre: string } | null)?.nombre !== 'estudiante')

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <header className="material sticky top-0 z-30 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-2xl mx-auto px-4 md:px-8 py-3 flex items-center gap-3">
          <Link href="/taller" className="flex items-center gap-2 flex-1 min-w-0">
            <IconoApp texto="TA" tamano={34} />
            <span className="min-w-0">
              <span className="block text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>El Taller del Alfarero</span>
              {persona && <span className="block text-xs truncate" style={{ color: 'var(--muted)' }}>{persona.nombre_completo}</span>}
            </span>
          </Link>
          {tienePanel && (
            <Link href="/" className="p-2 rounded-xl hover:opacity-70" aria-label="Volver al panel de administración"
              title="Volver al panel" style={{ color: 'var(--foreground)' }}>
              <LayoutGrid size={20} />
            </Link>
          )}
          <Link href="/taller/avisos" className="relative p-2 rounded-xl hover:opacity-70"
            aria-label={sinLeer ? `Avisos, ${sinLeer} sin leer` : 'Avisos'} style={{ color: 'var(--foreground)' }}>
            <Bell size={20} />
            {!!sinLeer && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center rounded-full text-white text-[10px] font-bold"
                style={{ background: 'var(--destructive)' }} aria-hidden="true">{sinLeer > 9 ? '9+' : sinLeer}</span>
            )}
          </Link>
          {persona && <Avatar nombre={persona.nombre_completo} fotoUrl={persona.foto_url} size="sm" />}
          <BotonSalir />
        </div>
      </header>
      <main className="pb-10 animate-page">{children}</main>
    </div>
  )
}
