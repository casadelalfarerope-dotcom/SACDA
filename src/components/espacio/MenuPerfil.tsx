'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { UserRound, LogOut } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import { createClient } from '@/lib/supabase/client'
import Flotante from '@/components/ui/Flotante'

// Foto de perfil en la barra superior: Mi perfil y Cerrar sesión. Para cambiar
// de espacio está la cuadrícula.
export default function MenuPerfil({ nombre, fotoUrl, email, perfilHref = '/mi/perfil' }: {
  nombre: string; fotoUrl: string | null; email: string | null; perfilHref?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [abierto, setAbierto] = useState(false)
  const boton = useRef<HTMLButtonElement>(null)
  const cerrar = useCallback(() => setAbierto(false), [])

  useEffect(() => setAbierto(false), [pathname])

  async function salir() {
    await createClient().auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const opcion = 'w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[15px] text-left transition-colors hover:bg-[color:var(--fill)]'

  return (
    <div className="relative">
      <button ref={boton} type="button" onClick={() => setAbierto((v) => !v)} aria-expanded={abierto} aria-haspopup="menu"
        aria-label="Abrir menú de perfil" className="rounded-full p-0.5 hover:opacity-80">
        <Avatar nombre={nombre} fotoUrl={fotoUrl} size="sm" />
      </button>
      <Flotante ancla={boton} abierto={abierto} onCerrar={cerrar} rol="menu" etiqueta="Perfil" ancho={256} alinear="fin">
          <div className="px-3 py-2.5">
            <p className="text-[15px] font-semibold truncate" style={{ color: 'var(--foreground)' }}>{nombre}</p>
            {email && <p className="text-[13px] truncate" style={{ color: 'var(--muted)' }}>{email}</p>}
          </div>
          <div className="h-px mx-2 my-1" style={{ background: 'var(--border)' }} />
          <Link role="menuitem" href={perfilHref} className={opcion} style={{ color: 'var(--foreground)' }}>
            <UserRound size={18} aria-hidden="true" /> Mi perfil
          </Link>
          <div className="h-px mx-2 my-1" style={{ background: 'var(--border)' }} />
          <button role="menuitem" type="button" onClick={salir} className={opcion} style={{ color: 'var(--destructive)' }}>
            <LogOut size={18} aria-hidden="true" /> Cerrar sesión
          </button>
      </Flotante>
    </div>
  )
}
