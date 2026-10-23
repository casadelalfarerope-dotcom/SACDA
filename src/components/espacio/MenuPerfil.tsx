'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { UserRound, LogOut } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import { createClient } from '@/lib/supabase/client'

// Foto de perfil en la barra superior: Mi perfil y Cerrar sesión. Para cambiar
// de espacio está la cuadrícula.
export default function MenuPerfil({ nombre, fotoUrl, email }: {
  nombre: string; fotoUrl: string | null; email: string | null
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => setAbierto(false), [pathname])
  useEffect(() => {
    if (!abierto) return
    const fuera = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setAbierto(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false) }
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', esc) }
  }, [abierto])

  async function salir() {
    await createClient().auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const opcion = 'w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[15px] text-left transition-colors hover:bg-[color:var(--fill)]'

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setAbierto((v) => !v)} aria-expanded={abierto} aria-haspopup="menu"
        aria-label="Abrir menú de perfil" className="rounded-full p-0.5 hover:opacity-80">
        <Avatar nombre={nombre} fotoUrl={fotoUrl} size="sm" />
      </button>
      {abierto && (
        <div role="menu" className="material absolute right-0 mt-2 w-64 rounded-2xl border p-1.5 z-50 animate-scale"
          style={{ borderColor: 'var(--border)', boxShadow: 'var(--shadow-float)' }}>
          <div className="px-3 py-2.5">
            <p className="text-[15px] font-semibold truncate" style={{ color: 'var(--foreground)' }}>{nombre}</p>
            {email && <p className="text-[13px] truncate" style={{ color: 'var(--muted)' }}>{email}</p>}
          </div>
          <div className="h-px mx-2 my-1" style={{ background: 'var(--border)' }} />
          <Link role="menuitem" href="/mi/perfil" className={opcion} style={{ color: 'var(--foreground)' }}>
            <UserRound size={18} aria-hidden="true" /> Mi perfil
          </Link>
          <div className="h-px mx-2 my-1" style={{ background: 'var(--border)' }} />
          <button role="menuitem" type="button" onClick={salir} className={opcion} style={{ color: 'var(--destructive)' }}>
            <LogOut size={18} aria-hidden="true" /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}
