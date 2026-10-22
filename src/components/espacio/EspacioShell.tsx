import Link from 'next/link'
import { Bell } from 'lucide-react'
import { IconoApp } from '@/components/ui/IconoApp'
import { contextoEspacio } from '@/lib/espacio'
import EspacioNav, { type ModuloEspacio } from './EspacioNav'
import MenuPerfil from './MenuPerfil'

// Armazón de "Mi espacio": barra superior fija (campana y perfil) y los
// módulos que corresponden a los roles de la persona.
export default async function EspacioShell({ children }: { children: React.ReactNode }) {
  const ctx = await contextoEspacio()
  const modulos: ModuloEspacio[] = [
    'inicio',
    ...(ctx.esServidor ? ['servicio' as const] : []),
    'solicitudes',
    'aportes',
    ...(ctx.esEstudiante ? ['academia' as const] : []),
  ]

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <header className="material sticky top-0 z-30 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 flex items-center gap-2">
          <Link href="/mi" className="flex items-center gap-2.5 flex-1 min-w-0">
            <IconoApp tamano={32} />
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold leading-tight truncate" style={{ color: 'var(--foreground)' }}>Casa del Alfarero</span>
              <span className="block text-xs truncate" style={{ color: 'var(--muted)' }}>Mi espacio</span>
            </span>
          </Link>
          <Link href="/mi/avisos" className="relative p-2 rounded-xl hover:opacity-70"
            aria-label={ctx.sinLeer ? `Avisos, ${ctx.sinLeer} sin leer` : 'Avisos'} style={{ color: 'var(--foreground)' }}>
            <Bell size={21} />
            {ctx.sinLeer > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 flex items-center justify-center rounded-full text-white text-[10px] font-bold"
                style={{ background: 'var(--destructive)' }} aria-hidden="true">{ctx.sinLeer > 9 ? '9+' : ctx.sinLeer}</span>
            )}
          </Link>
          <MenuPerfil nombre={ctx.persona.nombre_completo} fotoUrl={ctx.persona.foto_url}
            email={ctx.persona.email} tienePanel={ctx.tienePanel} />
        </div>
      </header>
      <div className="max-w-6xl mx-auto flex">
        <EspacioNav modulos={modulos} />
        <main className="flex-1 min-w-0 pb-24 md:pb-10 animate-page">{children}</main>
      </div>
    </div>
  )
}
