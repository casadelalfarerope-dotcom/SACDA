import Link from 'next/link'
import { Bell } from 'lucide-react'
import { IconoApp } from '@/components/ui/IconoApp'
import { contextoEspacio, MOSTRAR_APORTES } from '@/lib/espacio'
import EspacioNav, { type ModuloEspacio } from './EspacioNav'
import MenuPerfil from './MenuPerfil'
import SelectorEspacios, { RecordarEspacio, type Espacio } from './SelectorEspacios'

// Armazón de "Mi espacio" y de la Academia: barra superior fija (cuadrícula de
// espacios, campana y perfil) y los módulos que corresponden a la persona.
export default async function EspacioShell({ children, espacio = 'mi' }: { children: React.ReactNode; espacio?: 'mi' | 'academia' }) {
  const ctx = await contextoEspacio()
  const modulos: ModuloEspacio[] = espacio === 'academia' ? ['academia', 'calendario'] : [
    'inicio',
    ...(ctx.esServidor ? ['servicio' as const] : []),
    ...(ctx.esServidor ? ['capacitacion' as const] : []),
    ...(ctx.visitasPendientes > 0 ? ['visitas' as const] : []),
    'solicitudes',
    ...(MOSTRAR_APORTES ? ['aportes' as const] : []),
  ]
  const disponibles: Espacio[] = ['mi', ...(ctx.esEstudiante || espacio === 'academia' ? ['academia' as const] : []), ...(ctx.tienePanel ? ['admin' as const] : [])]
  const inicio = espacio === 'academia' ? '/taller' : '/mi'

  const marca = (tamano: number) => (
    <Link href={inicio} className="flex items-center gap-2.5 min-w-0">
      <IconoApp tamano={tamano} texto={espacio === 'academia' ? 'ATA' : 'CA'} />
      <span className="min-w-0">
        <span className="block text-[15px] font-semibold leading-tight truncate" style={{ color: 'var(--foreground)' }}>Casa del Alfarero</span>
        <span className="block text-xs truncate" style={{ color: 'var(--muted)' }}>{espacio === 'academia' ? 'Academia · El Taller del Alfarero' : 'Mi espacio'}</span>
      </span>
    </Link>
  )

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
      <EspacioNav modulos={modulos} marca={marca(36)} />
      <div className="flex-1 flex flex-col min-w-0">
      <header className="material sticky top-0 z-30 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="px-4 md:px-8 h-14 flex items-center gap-2">
          <RecordarEspacio espacio={espacio} />
          {/* En escritorio la marca está en la barra lateral. */}
          <div className="flex-1 min-w-0 md:hidden">{marca(32)}</div>
          <div className="hidden md:block flex-1" />
          <SelectorEspacios disponibles={disponibles} actual={espacio} />
          <Link href={`${inicio}/avisos`} className="relative p-2 rounded-xl hover:opacity-70"
            aria-label={ctx.sinLeer ? `Avisos, ${ctx.sinLeer} sin leer` : 'Avisos'} style={{ color: 'var(--foreground)' }}>
            <Bell size={21} />
            {ctx.sinLeer > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 flex items-center justify-center rounded-full text-white text-[10px] font-bold"
                style={{ background: 'var(--destructive)' }} aria-hidden="true">{ctx.sinLeer > 9 ? '9+' : ctx.sinLeer}</span>
            )}
          </Link>
          <MenuPerfil nombre={ctx.persona.nombre_completo} fotoUrl={ctx.persona.foto_url} email={ctx.persona.email} perfilHref={`${inicio}/perfil`} />
        </div>
      </header>
        <main className="flex-1 min-w-0 pb-24 md:pb-10 animate-page">{children}</main>
      </div>
    </div>
  )
}
