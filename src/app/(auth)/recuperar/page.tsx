'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function RecuperarPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    // Se muestra el mismo mensaje exista o no el correo, para no revelar quién tiene cuenta.
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/cambiar-contrasena`,
    })
    setEnviado(true)
    setLoading(false)
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--background)' }}>
      <div className="w-full max-w-sm">
        <Link href="/login" className="inline-flex items-center gap-1.5 text-sm mb-8 hover:opacity-70"
          style={{ color: 'var(--muted)' }}>
          <ArrowLeft size={16} /> Volver al inicio de sesión
        </Link>

        <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
          Recuperar contraseña
        </h1>

        {enviado ? (
          <div className="p-4 rounded-xl border flex gap-3" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <Mail size={18} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
            <p className="text-sm" style={{ color: 'var(--foreground)' }}>
              Si <strong>{email}</strong> tiene una cuenta, te llegará un correo con un enlace para crear una nueva contraseña. Revisa también la carpeta de spam.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
              Escribe tu correo y te enviaremos un enlace para crear una nueva contraseña.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="nombre@correo.com"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none border"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-60"
                style={{ background: 'var(--accent)', color: 'var(--accent-foreground)' }}>
                {loading ? 'Enviando...' : 'Enviar enlace'}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  )
}
