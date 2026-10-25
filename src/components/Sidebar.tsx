'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useTransition, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Avatar from './ui/Avatar'
import { IconoApp, IconoModulo } from './ui/IconoApp'
import type { Persona } from '@/types/database'
import { LogOut, Loader2, ChevronRight } from 'lucide-react'
import { gruposVisibles, moduloDeRuta, isActive, subActiva } from './navItems'

interface SidebarProps {
  persona: Persona | null
  modulos: string[]
}

export default function Sidebar({ persona, modulos }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  // Módulos con secciones internas abiertos a mano (el del módulo actual siempre se abre).
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set())
  const alternar = (href: string, abierto: boolean) => setAbiertos((s) => {
    const n = new Set(s); if (abierto) n.delete(href); else n.add(href); return n
  })

  useEffect(() => {
    if (!isPending) setPendingHref(null)
  }, [isPending])

  // Una sección sin permiso no muestra datos (lo impide la base de datos); además se redirige al inicio.
  useEffect(() => {
    const modulo = moduloDeRuta(pathname)
    if (modulo && !modulos.includes(modulo)) router.replace('/')
  }, [pathname, modulos, router])

  function navigate(href: string) {
    if (href === pathname) return
    setPendingHref(href)
    window.dispatchEvent(new Event('sacda:navegando'))
    startTransition(() => {
      router.push(href)
    })
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="material hidden md:flex flex-col w-64 h-screen sticky top-0 border-r"
      style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-3 px-5 pt-5 pb-4">
        <IconoApp tamano={36} />
        <div className="min-w-0">
          <p className="text-[15px] font-semibold leading-tight tracking-tight" style={{ color: 'var(--foreground)' }}>
            Casa del Alfarero
          </p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>Administración</p>
        </div>
      </div>

      <nav aria-label="Navegación principal" className="flex-1 px-3 pb-4 overflow-y-auto space-y-4">
        {gruposVisibles(modulos).map((grupo, gi) => (
          <div key={gi}>
            {grupo.titulo && (
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                {grupo.titulo}
              </p>
            )}
            <ul className="space-y-0.5">
              {grupo.items.map(({ href, label, icon, color, sub }) => {
                const active = isActive(href, pathname)
                const pending = pendingHref === href && isPending
                const abierto = !!sub && (abiertos.has(href) !== active)
                const actual = sub && active ? subActiva(sub, pathname) : undefined
                return (
                  <li key={href}>
                    <div className="relative">
                    <button
                      type="button"
                      aria-current={active ? 'page' : undefined}
                      onClick={() => navigate(href)}
                      disabled={pending}
                      className={`w-full flex items-center gap-3 px-2.5 py-1.5 rounded-[10px] text-[14px] text-left transition-colors hover:bg-[color:var(--fill)] ${sub ? 'pr-9' : ''}`}
                      style={{
                        background: active ? 'color-mix(in srgb, var(--accent) 14%, transparent)' : undefined,
                        color: active ? 'var(--accent)' : 'var(--foreground)',
                        fontWeight: active ? 600 : 450,
                      }}>
                      {pending
                        ? <span className="w-7 h-7 flex items-center justify-center"><Loader2 size={16} className="animate-spin" /></span>
                        : <IconoModulo icon={icon} color={color} />}
                      <span className="truncate">{label}</span>
                    </button>
                    {sub && (
                      <button type="button" onClick={() => alternar(href, abierto)} aria-expanded={abierto}
                        aria-label={`${abierto ? 'Ocultar' : 'Ver'} secciones de ${label}`}
                        className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center hover:bg-[color:var(--fill)]"
                        style={{ color: 'var(--muted)' }}>
                        <ChevronRight size={15} aria-hidden="true" className="transition-transform" style={{ transform: abierto ? 'rotate(90deg)' : undefined }} />
                      </button>
                    )}
                    </div>
                    {sub && abierto && (
                      <ul className="mt-0.5 mb-1 ml-[22px] pl-3 border-l space-y-0.5" style={{ borderColor: 'var(--border)' }}>
                        {sub.map((s) => {
                          const marcado = actual === s.href
                          const cargando = pendingHref === s.href && isPending
                          return (
                            <li key={s.href}>
                              <button type="button" onClick={() => navigate(s.href)} aria-current={marcado ? 'page' : undefined}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[8px] text-[13.5px] text-left transition-colors hover:bg-[color:var(--fill)]"
                                style={{ color: marcado ? 'var(--accent)' : 'var(--foreground)', fontWeight: marcado ? 600 : 450 }}>
                                <span className="truncate">{s.label}</span>
                                {cargando && <Loader2 size={13} className="animate-spin ml-auto" aria-hidden="true" />}
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="px-3 pb-4 pt-3 border-t space-y-1" style={{ borderColor: 'var(--border)' }}>
        {persona && (
          <div className="flex items-center gap-3 px-2.5 py-2">
            <Avatar nombre={persona.nombre_completo} fotoUrl={persona.foto_url} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                {persona.nombre_completo}
              </p>
              <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>
                {persona.email ?? 'Sin correo'}
              </p>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-2.5 py-2 rounded-[10px] text-sm transition-colors hover:bg-[color:var(--fill)]"
          style={{ color: 'var(--muted)' }}>
          <LogOut size={17} aria-hidden="true" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
