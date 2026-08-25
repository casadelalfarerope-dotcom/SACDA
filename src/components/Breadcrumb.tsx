'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

const LABELS: Record<string, string> = {
  congregantes:   'Congregantes',
  miembros:       'Miembros',
  ausencias:      'Ausencias',
  visitas:        'Visitas',
  ceremonias:     'Ceremonias',
  ministerios:    'Ministerios',
  calendario:     'Calendario',
  servidores:     'Servidores',
  capacitacion:   'Capacitación',
  tareas:         'Tareas',
  finanzas:       'Finanzas',
  aportes:        'Aportes',
  gastos:         'Gastos',
  inventario:     'Inventario',
  ventas:         'Ventas',
  notificaciones: 'Notificaciones',
  roles:          'Roles y Permisos',
  configuracion:  'Configuración',
  nueva:          'Nueva',
  nuevo:          'Nuevo',
  editar:         'Editar',
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isUUID(s: string) { return UUID_RE.test(s) }

interface Crumb { label: string; href: string }

export default function Breadcrumb() {
  const pathname = usePathname()

  if (pathname === '/') return (
    <div className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--foreground)' }}>
      <Home size={15} />
      <span>Inicio</span>
    </div>
  )

  const segments = pathname.split('/').filter(Boolean)
  const crumbs: Crumb[] = [{ label: 'Inicio', href: '/' }]

  let accumulated = ''
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]!
    accumulated += `/${seg}`

    if (isUUID(seg)) {
      // Si el segmento anterior tiene un label, este segmento es "Detalle"
      // Solo lo añadimos si NO es el último (porque "Editar" lo cubre luego)
      if (i < segments.length - 1) {
        crumbs.push({ label: 'Detalle', href: accumulated })
      } else {
        crumbs.push({ label: 'Detalle', href: accumulated })
      }
    } else {
      const label = LABELS[seg] ?? seg
      crumbs.push({ label, href: accumulated })
    }
  }

  return (
    <nav aria-label="Ruta de navegación" className="flex items-center gap-1 text-sm min-w-0">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1
        return (
          <span key={crumb.href} className="flex items-center gap-1 min-w-0">
            {i > 0 && (
              <ChevronRight size={13} className="flex-shrink-0" style={{ color: 'var(--muted)' }} />
            )}
            {isLast ? (
              <span className="font-semibold truncate max-w-[140px] md:max-w-xs"
                style={{ color: 'var(--foreground)' }}>
                {crumb.label}
              </span>
            ) : (
              <Link href={crumb.href}
                className="truncate max-w-[80px] md:max-w-[120px] hover:underline underline-offset-2 transition-opacity hover:opacity-70"
                style={{ color: 'var(--muted)' }}>
                {i === 0 ? <Home size={14} className="inline -mt-0.5" /> : crumb.label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
