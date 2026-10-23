'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Home, Mic2, ShoppingBag, Wallet, School, Loader2, type LucideIcon } from 'lucide-react'
import { IconoModulo } from '@/components/ui/IconoApp'

export type ModuloEspacio = 'inicio' | 'servicio' | 'solicitudes' | 'aportes' | 'academia'

const MODULOS: Record<ModuloEspacio, { href: string; label: string; icon: LucideIcon; color: string; rutas: string[] }> = {
  inicio:      { href: '/mi',             label: 'Inicio',      icon: Home,        color: '#007aff', rutas: [] },
  servicio:    { href: '/mi/ministerios', label: 'Ministerios', icon: Mic2,        color: '#ff2d55', rutas: ['/mi/tareas', '/mi/servicio'] },
  solicitudes: { href: '/mi/solicitudes', label: 'Solicitudes', icon: ShoppingBag, color: '#00c7be', rutas: [] },
  aportes:     { href: '/mi/aportes',     label: 'Mis aportes', icon: Wallet,      color: '#34c759', rutas: [] },
  academia:    { href: '/taller',         label: 'Academia',    icon: School,      color: '#af52de', rutas: [] },
}

function activo(m: ModuloEspacio, pathname: string) {
  const { href, rutas } = MODULOS[m]
  if (href === '/mi') return pathname === '/mi'
  return [href, ...rutas].some((r) => pathname === r || pathname.startsWith(r + '/'))
}

// Barra lateral en escritorio y barra inferior en celular: solo cambian los
// módulos; la campana y el perfil viven en la barra superior.
export default function EspacioNav({ modulos }: { modulos: ModuloEspacio[] }) {
  const pathname = usePathname()
  // Módulo tocado mientras carga: se resalta al instante y muestra un indicador.
  const [cargando, setCargando] = useState<ModuloEspacio | null>(null)
  useEffect(() => setCargando(null), [pathname])
  const resaltado = (m: ModuloEspacio) => (cargando ? cargando === m : activo(m, pathname))
  const tocar = (m: ModuloEspacio) => { if (!activo(m, pathname) || pathname !== MODULOS[m].href) setCargando(m) }

  return (
    <>
      <nav aria-label="Módulos" className="hidden md:block w-60 flex-shrink-0 px-3 py-5">
        <ul className="space-y-0.5 sticky top-20">
          {modulos.map((m) => {
            const { href, label, icon, color } = MODULOS[m]
            const act = resaltado(m)
            return (
              <li key={m}>
                <Link href={href} aria-current={activo(m, pathname) ? 'page' : undefined} onClick={() => tocar(m)}
                  className="flex items-center gap-3 px-2.5 py-1.5 rounded-[10px] text-[14px] transition-colors hover:bg-[color:var(--fill)]"
                  style={{
                    background: act ? 'color-mix(in srgb, var(--accent) 14%, transparent)' : undefined,
                    color: act ? 'var(--accent)' : 'var(--foreground)',
                    fontWeight: act ? 600 : 450,
                  }}>
                  {cargando === m
                    ? <span className="w-7 h-7 flex items-center justify-center"><Loader2 size={16} className="animate-spin" /></span>
                    : <IconoModulo icon={icon} color={color} />}
                  <span className="truncate">{label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {modulos.length > 1 && (
        <nav aria-label="Módulos"
          className="material md:hidden fixed bottom-0 left-0 right-0 z-40 border-t pb-[env(safe-area-inset-bottom)]"
          style={{ borderColor: 'var(--border)' }}>
          {cargando && (
            <div className="absolute top-0 left-0 right-0 h-0.5 overflow-hidden" aria-hidden="true">
              <div className="h-full rounded-full" style={{ background: 'var(--accent)', animation: 'ui-progress 1.2s ease-in-out infinite' }} />
            </div>
          )}
          <div className="flex items-stretch">
            {modulos.map((m) => {
              const { href, label, icon: Icon } = MODULOS[m]
              const act = resaltado(m)
              return (
                <Link key={m} href={href} aria-current={activo(m, pathname) ? 'page' : undefined} onClick={() => tocar(m)}
                  className="flex-1 min-w-0 flex flex-col items-center justify-center pt-2 pb-1.5 gap-0.5 text-[10.5px] font-medium"
                  style={{ color: act ? 'var(--accent)' : 'var(--foreground)', opacity: act ? 1 : 0.55 }}>
                  {cargando === m
                    ? <Loader2 size={22} className="animate-spin" aria-hidden="true" />
                    : <Icon size={22} strokeWidth={act ? 2.5 : 2} aria-hidden="true" />}
                  <span className="truncate max-w-full px-1">{label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      )}
    </>
  )
}
