'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useTransition, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { LayoutDashboard, Users, Calendar, DollarSign, Menu, X, LogOut, Loader2 } from 'lucide-react'
import { gruposVisibles, isActive } from './navItems'
import { IconoModulo } from './ui/IconoApp'

const TODOS_PRINCIPALES = [
  { href: '/',             label: 'Inicio',     icon: LayoutDashboard, modulo: undefined },
  { href: '/congregantes', label: 'Personas',   icon: Users,           modulo: 'congregantes' },
  { href: '/calendario',   label: 'Calendario', icon: Calendar,        modulo: 'calendario' },
  { href: '/finanzas',     label: 'Finanzas',   icon: DollarSign,      modulo: 'finanzas' },
]

export default function BottomNav({ modulos }: { modulos: string[] }) {
  const PRINCIPALES = TODOS_PRINCIPALES.filter((p) => !p.modulo || modulos.includes(p.modulo))
  const SECUNDARIOS = gruposVisibles(modulos).flatMap((g) => g.items)
    .filter((i) => !PRINCIPALES.some((p) => p.href === i.href))
  const pathname = usePathname()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  const [masAbierto, setMasAbierto] = useState(false)

  useEffect(() => {
    if (!isPending) setPendingHref(null)
  }, [isPending])

  useEffect(() => setMasAbierto(false), [pathname])

  useEffect(() => {
    if (!masAbierto) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMasAbierto(false) }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [masAbierto])

  function navigate(href: string) {
    if (href === pathname) { setMasAbierto(false); return }
    setPendingHref(href)
    startTransition(() => {
      router.push(href)
    })
  }

  async function handleLogout() {
    await createClient().auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const masActivo = SECUNDARIOS.some((i) => isActive(i.href, pathname))

  return (
    <>
      {masAbierto && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setMasAbierto(false)}
          style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Más secciones"
            onClick={(e) => e.stopPropagation()}
            className="material absolute bottom-0 left-0 right-0 rounded-t-[28px] px-4 pt-2 pb-24 max-h-[80vh] overflow-y-auto animate-scale"
            style={{ boxShadow: 'var(--shadow-float)' }}>
            <div className="mx-auto mb-2 h-1 w-9 rounded-full" style={{ background: 'var(--border)' }} aria-hidden="true" />
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Más secciones</p>
              <button type="button" onClick={() => setMasAbierto(false)} aria-label="Cerrar"
                className="p-2 rounded-xl" style={{ color: 'var(--muted)' }}>
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {SECUNDARIOS.map(({ href, label, icon, color }) => {
                const active = isActive(href, pathname)
                const pending = pendingHref === href && isPending
                return (
                  <button key={href} type="button" onClick={() => navigate(href)}
                    aria-current={active ? 'page' : undefined}
                    className="flex flex-col items-center justify-center gap-2 py-3 rounded-2xl text-xs font-medium"
                    style={{
                      background: active ? 'color-mix(in srgb, var(--accent) 14%, transparent)' : 'transparent',
                      color: active ? 'var(--accent)' : 'var(--foreground)',
                    }}>
                    {pending ? <Loader2 size={22} className="animate-spin" /> : <IconoModulo icon={icon} color={color} tamano={44} />}
                    {label}
                  </button>
                )
              })}
            </div>
            <button type="button" onClick={handleLogout}
              className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold"
              style={{ background: 'var(--fill)', color: 'var(--destructive)' }}>
              <LogOut size={18} /> Salir
            </button>
          </div>
        </div>
      )}

      <nav aria-label="Navegación principal"
        className="material md:hidden fixed bottom-0 left-0 right-0 z-50 border-t pb-[env(safe-area-inset-bottom)]"
        style={{ borderColor: 'var(--border)' }}>
        {isPending && (
          <div className="absolute top-0 left-0 right-0 h-0.5 overflow-hidden">
            <div className="h-full rounded-full"
              style={{ background: 'var(--accent)', animation: 'ui-progress 1.2s ease-in-out infinite' }} />
          </div>
        )}
        <div className="flex items-stretch">
          {PRINCIPALES.map(({ href, label, icon: Icon }) => {
            const active = isActive(href, pathname) && !masAbierto
            const pending = pendingHref === href && isPending
            return (
              <button key={href} type="button" onClick={() => navigate(href)} disabled={pending}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center pt-2 pb-1.5 gap-0.5 text-[10.5px] font-medium transition-all',
                  active || pending ? '' : 'opacity-55'
                )}
                style={{ color: active || pending ? 'var(--accent)' : 'var(--foreground)' }}>
                {pending
                  ? <Loader2 size={22} className="animate-spin" />
                  : <Icon size={22} strokeWidth={active ? 2.5 : 2} />}
                <span>{label}</span>
              </button>
            )
          })}
          <button type="button" onClick={() => setMasAbierto((v) => !v)}
            aria-expanded={masAbierto}
            className={cn(
              'flex-1 flex flex-col items-center justify-center pt-2 pb-1.5 gap-0.5 text-[10.5px] font-medium transition-all',
              masAbierto || masActivo ? '' : 'opacity-55'
            )}
            style={{ color: masAbierto || masActivo ? 'var(--accent)' : 'var(--foreground)' }}>
            <Menu size={22} strokeWidth={masAbierto || masActivo ? 2.5 : 2} />
            <span>Más</span>
          </button>
        </div>
      </nav>
    </>
  )
}
