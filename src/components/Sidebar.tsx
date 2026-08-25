'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useTransition, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import Avatar from './ui/Avatar'
import type { Persona } from '@/types/database'
import {
  LayoutDashboard,
  Users,
  UserCheck,
  LogOut,
  Settings,
  Shield,
  BookOpen,
  Calendar,
  Bell,
  Mic2,
  GraduationCap,
  ClipboardList,
  DollarSign,
  Package,
  ShoppingBag,
  Loader2,
} from 'lucide-react'

const navItems = [
  { href: '/',               label: 'Inicio',         icon: LayoutDashboard },
  { href: '/congregantes',   label: 'Congregantes',   icon: Users },
  { href: '/miembros',       label: 'Miembros',       icon: UserCheck },
  { href: '/ministerios',    label: 'Ministerios',    icon: BookOpen },
  { href: '/calendario',     label: 'Calendario',     icon: Calendar },
  { href: '/servidores',     label: 'Servidores',     icon: Mic2 },
  { href: '/capacitacion',   label: 'Capacitación',   icon: GraduationCap },
  { href: '/tareas',         label: 'Tareas',         icon: ClipboardList },
  { href: '/finanzas',       label: 'Finanzas',       icon: DollarSign },
  { href: '/inventario',     label: 'Inventario',     icon: Package },
  { href: '/ventas',         label: 'Ventas',         icon: ShoppingBag },
  { href: '/notificaciones', label: 'Notificaciones', icon: Bell },
  { href: '/roles',          label: 'Roles',          icon: Shield },
  { href: '/configuracion',  label: 'Configuración',  icon: Settings },
]

interface SidebarProps {
  persona: Persona | null
}

export default function Sidebar({ persona }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  // Limpia el pending cuando la navegación termina
  useEffect(() => {
    if (!isPending) setPendingHref(null)
  }, [isPending])

  function navigate(href: string) {
    if (href === pathname) return
    setPendingHref(href)
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
    <aside className="hidden md:flex flex-col w-60 min-h-screen border-r"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b"
        style={{ borderColor: 'var(--border)' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold"
          style={{ background: 'var(--accent)' }}>
          CA
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--foreground)' }}>
            Casa del Alfarero
          </p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>Administración</p>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          const pending = pendingHref === href && isPending
          return (
            <button
              key={href}
              onClick={() => navigate(href)}
              disabled={pending}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left',
                active   ? 'text-white' : '',
                pending  ? 'opacity-80' : 'hover:opacity-70',
              )}
              style={active || pending
                ? { background: 'var(--accent)', color: '#fff' }
                : { color: 'var(--foreground)' }
              }>
              {pending
                ? <Loader2 size={18} className="animate-spin" />
                : <Icon size={18} className={active ? 'text-white' : ''} />
              }
              {label}
            </button>
          )
        })}
      </nav>

      {/* Usuario */}
      <div className="px-3 pb-4 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
        {persona && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl mb-1"
            style={{ background: 'var(--surface-secondary)' }}>
            <Avatar nombre={persona.nombre_completo} fotoUrl={persona.foto_url} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                {persona.nombre_completo.split(' ')[0]}
              </p>
              <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>
                {persona.email ?? 'Sin correo'}
              </p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-70"
          style={{ color: 'var(--muted)' }}>
          <LogOut size={18} />
          Salir
        </button>
      </div>
    </aside>
  )
}
