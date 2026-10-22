'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// El correo de invitación por defecto de Supabase devuelve la sesión en el hash de la URL.
export default function InvitacionPage() {
  const router = useRouter()
  const [error, setError] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1))
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')
    if (!access_token || !refresh_token) { setError(true); return }

    createClient().auth.setSession({ access_token, refresh_token }).then(({ error }) => {
      if (error) { setError(true); return }
      window.history.replaceState(null, '', window.location.pathname)
      router.replace('/cambiar-contrasena')
    })
  }, [router])

  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--background)' }}>
      <div className="text-center max-w-sm">
        {error ? (
          <>
            <p className="text-sm mb-4" style={{ color: 'var(--foreground)' }}>
              El enlace de invitación no es válido o ya venció. Pide a un administrador que te invite de nuevo,
              o entra con Google usando el correo invitado.
            </p>
            <Link href="/login" className="text-sm underline" style={{ color: 'var(--accent)' }}>Ir al inicio de sesión</Link>
          </>
        ) : (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Activando tu cuenta…</p>
        )}
      </div>
    </main>
  )
}
