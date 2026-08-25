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
    .select('persona_id')
    .eq('id', user.id)
    .single()

  let persona: Persona | null = null
  if (cuenta) {
    const { data } = await supabase
      .from('personas')
      .select('*')
      .eq('id', cuenta.persona_id)
      .single()
    persona = data
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
      <Sidebar persona={persona} />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Barra superior con breadcrumb y campanita */}
        <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <Breadcrumb />
          <NotifBell personaId={cuenta?.persona_id ?? null} />
        </header>
        <main className="flex-1 pb-20 md:pb-0 animate-page">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
