'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useTransition, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Calendar,
  DollarSign,
  Package,
  Loader2,
} from 'lucide-react'

const navItems = [
  { href: '/',             label: 'Inicio',     icon: LayoutDashboard },
  { href: '/congregantes', label: 'Personas',   icon: Users },
  { href: '/calendario',   label: 'Calendario', icon: Calendar },
  { href: '/finanzas',     label: 'Finanzas',   icon: DollarSign },
  { href: '/inventario',   label: 'Inventario', icon: Package },
]

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pendingHref, setPendingHref] = useState<string | null>(null)

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

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t pb-safe"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--border)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}>
      {/* Barra de progreso en la parte superior del nav cuando carga */}
      {isPending && (
        <div className="absolute top-0 left-0 right-0 h-0.5 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              background: 'var(--accent)',
              animation: 'ui-progress 1.2s ease-in-out infinite',
            }}
          />
        </div>
      )}
      <div className="flex items-stretch">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          const pending = pendingHref === href && isPending
          return (
            <button
              key={href}
              onClick={() => navigate(href)}
              disabled={pending}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-all',
                active || pending ? '' : 'opacity-50'
              )}
              style={{ color: active || pending ? 'var(--accent)' : 'var(--foreground)' }}>
              {pending
                ? <Loader2 size={22} className="animate-spin" />
                : <Icon size={22} strokeWidth={active ? 2.5 : 2} />
              }
              <span>{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
