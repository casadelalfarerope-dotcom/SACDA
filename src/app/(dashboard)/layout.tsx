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

  // Módulos que puede ver; quien no tiene ninguno (servidores y estudiantes) usa Mi espacio.
  let modulos: string[] = []
  if (cuenta) {
    const { data: roles } = await supabase.from('roles_asignados')
      .select('rol_id').eq('persona_id', cuenta.persona_id).eq('activo', true)
    const rolIds = (roles ?? []).map((r) => r.rol_id as string)
    const { data: permisos } = rolIds.length
      ? await supabase.from('permisos_modulo').select('modulo').in('rol_id', rolIds).eq('puede_ver', true)
      : { data: [] }
    modulos = [...new Set((permisos ?? []).map((p) => p.modulo as string))]
  }
  if (!modulos.length) redirect('/mi')

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
      <Sidebar persona={persona} modulos={modulos} />
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
      <BottomNav modulos={modulos} />
    </div>
  )
}
