'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Grip, Home, School, LayoutGrid, type LucideIcon } from 'lucide-react'
import { IconoModulo } from '@/components/ui/IconoApp'
import Flotante from '@/components/ui/Flotante'

export type Espacio = 'mi' | 'academia' | 'admin'

const ESPACIOS: Record<Espacio, { href: string; label: string; icon: LucideIcon; color: string }> = {
  mi:       { href: '/mi',     label: 'Mi espacio',     icon: Home,       color: '#a35d2d' },
  academia: { href: '/taller', label: 'Academia',       icon: School,     color: '#af52de' },
  admin:    { href: '/',       label: 'Administración', icon: LayoutGrid, color: '#636366' },
}

export const COOKIE_ESPACIO = 'sacda_espacio'

// Guarda el espacio actual para que al volver a iniciar sesión se abra el mismo.
export function RecordarEspacio({ espacio }: { espacio: Espacio }) {
  useEffect(() => {
    document.cookie = `${COOKIE_ESPACIO}=${espacio}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
  }, [espacio])
  return null
}

// Cuadrícula de la barra superior para cambiar entre los espacios a los que
// la persona tiene acceso. Con un solo espacio no se muestra.
export default function SelectorEspacios({ disponibles, actual }: { disponibles: Espacio[]; actual: Espacio }) {
  const pathname = usePathname()
  const [abierto, setAbierto] = useState(false)
  const boton = useRef<HTMLButtonElement>(null)
  const cerrar = useCallback(() => setAbierto(false), [])

  useEffect(() => setAbierto(false), [pathname])

  if (disponibles.length < 2) return null

  return (
    <div className="relative">
      <button ref={boton} type="button" onClick={() => setAbierto((v) => !v)} aria-expanded={abierto} aria-haspopup="menu"
        aria-label="Cambiar de espacio" className="p-2 rounded-xl hover:opacity-70" style={{ color: 'var(--foreground)' }}>
        <Grip size={21} />
      </button>
      <Flotante ancla={boton} abierto={abierto} onCerrar={cerrar} rol="menu" etiqueta="Espacios" ancho={288} alinear="fin" className="p-3">
          <div className="grid grid-cols-3 gap-1">
            {disponibles.map((e) => {
              const { href, label, icon, color } = ESPACIOS[e]
              const activo = e === actual
              return (
                <Link key={e} href={href} role="menuitem" aria-current={activo ? 'page' : undefined}
                  className="flex flex-col items-center gap-2 py-3 px-1 rounded-2xl text-[12px] font-medium text-center transition-colors hover:bg-[color:var(--fill)]"
                  style={{
                    background: activo ? 'color-mix(in srgb, var(--accent) 14%, transparent)' : undefined,
                    color: activo ? 'var(--accent)' : 'var(--foreground)',
                  }}>
                  <IconoModulo icon={icon} color={color} tamano={44} />
                  {label}
                </Link>
              )
            })}
          </div>
      </Flotante>
    </div>
  )
}
