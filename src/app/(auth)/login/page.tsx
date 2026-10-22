'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { IconoApp } from '@/components/ui/IconoApp'

const ERRORES: Record<string, string> = {
  sin_acceso: 'Este correo no tiene acceso. Pide a un administrador que te invite.',
  inactiva:   'Tu cuenta está desactivada. Contacta a un administrador.',
  enlace:     'El enlace no es válido o ya venció. Inténtalo de nuevo.',
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
    </svg>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const codigo = new URLSearchParams(window.location.search).get('error')
    if (codigo && ERRORES[codigo]) setError(ERRORES[codigo])
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Correo o contraseña incorrectos.')
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  async function handleGoogle() {
    setLoadingGoogle(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      setError('No se pudo conectar con Google. Inténtalo de nuevo.')
      setLoadingGoogle(false)
    }
  }

  const inputStyle = {
    background: 'var(--surface)',
    borderColor: 'var(--border)',
    color: 'var(--foreground)',
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--background)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <IconoApp tamano={76} className="mx-auto mb-5" />
          <h1 className="text-[28px] font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>
            Casa del Alfarero
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            Sistema de administración interna
          </p>
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={loadingGoogle}
          className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-3 border transition-opacity hover:opacity-80 disabled:opacity-60"
          style={inputStyle}>
          {loadingGoogle
            ? <span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
            : <GoogleIcon />}
          Continuar con Google
        </button>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          <span className="text-xs" style={{ color: 'var(--muted)' }}>o con tu correo</span>
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="nombre@correo.com"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all border"
              style={inputStyle}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                Contraseña
              </label>
              <Link href="/recuperar" className="text-xs hover:opacity-70" style={{ color: 'var(--accent)' }}>
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full px-4 py-3 pr-12 rounded-xl text-sm outline-none transition-all border"
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                style={{ color: 'var(--muted)' }}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm px-4 py-3 rounded-xl"
              style={{ background: '#ff3b3015', color: 'var(--destructive)' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
            style={{ background: 'var(--accent)', color: 'var(--accent-foreground)' }}>
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <LogIn size={16} />
            )}
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p className="text-center text-xs mt-8" style={{ color: 'var(--muted)' }}>
          Solo para personas invitadas por la iglesia.
        </p>
      </div>
    </main>
  )
}
