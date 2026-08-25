'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, LogIn } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <main className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--background)' }}>
      <div className="w-full max-w-sm">
        {/* Logo / cabecera */}
        <div className="text-center mb-10">
          <div className="mx-auto mb-4 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: 'var(--accent)' }}>
            <span className="text-white text-2xl font-bold">CA</span>
          </div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--foreground)' }}>
            Casa del Alfarero
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            Sistema de administración interna
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--foreground)' }}>
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
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)',
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--foreground)' }}>
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full px-4 py-3 pr-12 rounded-xl text-sm outline-none transition-all border"
                style={{
                  background: 'var(--surface)',
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
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
          Solo para líderes y administradores autorizados.
        </p>
      </div>
    </main>
  )
}
