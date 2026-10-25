'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ChevronRight, ChevronDown, Home, Check } from 'lucide-react'
import { NAV_ITEMS, subActiva, type SubItem } from './navItems'

// Flechita junto a un módulo que abre la lista de sus secciones internas.
function MenuSecciones({ modulo, sub, pathname }: { modulo: string; sub: SubItem[]; pathname: string }) {
  const [abierto, setAbierto] = useState(false)
  const caja = useRef<HTMLSpanElement>(null)
  const actual = subActiva(sub, pathname)
  useEffect(() => setAbierto(false), [pathname])
  useEffect(() => {
    if (!abierto) return
    const fuera = (e: PointerEvent) => { if (!caja.current?.contains(e.target as Node)) setAbierto(false) }
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false) }
    document.addEventListener('pointerdown', fuera)
    document.addEventListener('keydown', tecla)
    return () => { document.removeEventListener('pointerdown', fuera); document.removeEventListener('keydown', tecla) }
  }, [abierto])
  return (
    <span ref={caja} className="relative flex-shrink-0">
      <button type="button" onClick={() => setAbierto(!abierto)} aria-expanded={abierto} aria-haspopup="true"
        aria-label={`Secciones de ${modulo}`}
        className="w-6 h-6 -ml-0.5 rounded-full flex items-center justify-center hover:bg-[color:var(--fill)]"
        style={{ color: 'var(--muted)', background: abierto ? 'var(--fill)' : undefined }}>
        <ChevronDown size={14} aria-hidden="true" className="transition-transform" style={{ transform: abierto ? 'rotate(180deg)' : undefined }} />
      </button>
      {abierto && (
        <ul className="absolute left-0 top-8 z-50 min-w-[200px] py-1.5 rounded-xl border shadow-lg"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <li className="px-3.5 pt-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>{modulo}</li>
          {sub.map((s) => (
            <li key={s.href}>
              <Link href={s.href} aria-current={actual === s.href ? 'page' : undefined}
                className="flex items-center gap-2 px-3.5 py-2 text-[14px] hover:bg-[color:var(--fill)]"
                style={{ color: actual === s.href ? 'var(--accent)' : 'var(--foreground)', fontWeight: actual === s.href ? 600 : 450 }}>
                <span className="flex-1">{s.label}</span>
                {actual === s.href && <Check size={14} aria-hidden="true" />}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </span>
  )
}

const LABELS: Record<string, string> = {
  congregantes:   'Congregantes',
  miembros:       'Seguimiento',
  ausencias:      'Faltaron',
  'visitas-pastorales': 'Visitas pastorales',
  visitas:        'Nuevos',
  ceremonias:     'Ceremonias',
  ministerios:    'Ministerios',
  calendario:     'Calendario',
  servidores:     'Servidores',
  capacitacion:   'Capacitación',
  tareas:         'Tareas',
  finanzas:       'Finanzas',
  aportes:        'Aportes',
  gastos:         'Gastos',
  actividades:    'Actividades',
  inventario:     'Inventario',
  ventas:         'Ventas',
  notificaciones: 'Notificaciones',
  roles:          'Roles',
  configuracion:  'Configuración',
  academia:       'Academia',
  cursos:         'Curso',
  temas:          'Tema',
  sesiones:       'Clase',
  examenes:       'Examen',
  evento:         'Evento',
  estadisticas:   'Estadísticas',
  nueva:          'Nueva',
  nuevo:          'Nuevo',
  editar:         'Editar',
}

const SIN_LISTADO = new Set(['cursos', 'temas', 'sesiones', 'examenes', 'evento'])

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

    // Colecciones de la academia sin página de listado: se muestra "Curso", "Tema"… en el registro.
    if (SIN_LISTADO.has(seg) && isUUID(segments[i + 1] ?? '')) continue
    if (isUUID(seg)) {
      const anterior = segments[i - 1] ?? ''
      crumbs.push({ label: SIN_LISTADO.has(anterior) ? LABELS[anterior]! : 'Detalle', href: accumulated })
    } else {
      const label = LABELS[seg] ?? seg
      crumbs.push({ label, href: accumulated })
    }
  }

  const sub = NAV_ITEMS.find((n) => n.href === `/${segments[0]}`)?.sub

  return (
    <nav aria-label="Ruta de navegación" className="flex items-center gap-1 text-sm min-w-0">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1
        return (
          <span key={crumb.href} className="flex items-center gap-1 min-w-0">
            {i > 0 && (
              <ChevronRight size={13} className="flex-shrink-0" style={{ color: 'var(--muted)' }} />
            )}
            {i === 1 && sub ? (
              <>
                {isLast
                  ? <span aria-current="page" className="font-semibold truncate max-w-[140px] md:max-w-xs" style={{ color: 'var(--foreground)' }}>{crumb.label}</span>
                  : <Link href={crumb.href} className="truncate max-w-[80px] md:max-w-[120px] hover:opacity-70" style={{ color: 'var(--muted)' }}>{crumb.label}</Link>}
                <MenuSecciones modulo={crumb.label} sub={sub} pathname={pathname} />
              </>
            ) : isLast ? (
              <span aria-current="page" className="font-semibold truncate max-w-[140px] md:max-w-xs"
                style={{ color: 'var(--foreground)' }}>
                {crumb.label}
              </span>
            ) : (
              <Link href={crumb.href}
                aria-label={i === 0 ? 'Inicio' : undefined}
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
