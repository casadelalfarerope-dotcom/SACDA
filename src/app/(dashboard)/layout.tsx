import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import BottomNav from '@/components/BottomNav'
import NotifBell from '@/components/NotifBell'
import Breadcrumb from '@/components/Breadcrumb'
import type { Persona } from '@/types/database'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: cuenta } = await supabase
    .from('cuentas')
    .select('persona_id, persona:personas(*)')
    .eq('id', user.id)
    .maybeSingle()

  const persona = (cuenta?.persona as unknown as Persona | null) ?? null

  if (cuenta) {
    const { data: roles } = await supabase.from('roles_asignados')
      .select('rol:roles(nombre)').eq('persona_id', cuenta.persona_id).eq('activo', true)
    const nombres = (roles ?? []).map((r) => (r.rol as unknown as { nombre: string } | null)?.nombre)
    if (nombres.length > 0 && nombres.every((n) => n === 'estudiante')) redirect('/taller')
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
      <Sidebar persona={persona} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="material sticky top-0 z-30 flex items-center justify-between gap-3 px-4 md:px-8 h-12 border-b"
          style={{ borderColor: 'var(--border)' }}>
          <Breadcrumb />
          <NotifBell personaId={cuenta?.persona_id ?? null} />
        </header>
        <main className="flex-1 pb-24 md:pb-10 md:pt-2 animate-page">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
