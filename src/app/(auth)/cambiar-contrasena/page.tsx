'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function CambiarContrasenaPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.')
    if (password !== confirmar) return setError('Las contraseñas no coinciden.')

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message.includes('different')
        ? 'La nueva contraseña debe ser distinta a la anterior.'
        : 'No se pudo guardar la contraseña. Inténtalo de nuevo.')
      setLoading(false)
      return
    }
    router.push('/')
    router.refresh()
  }

  const inputStyle = { background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--foreground)' }

  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--background)' }}>
      <div className="w-full max-w-sm">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm mb-8 hover:opacity-70"
          style={{ color: 'var(--muted)' }}>
          <ArrowLeft size={16} /> Ir al inicio
        </Link>

        <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
          Crear contraseña
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
          Elige una contraseña de al menos 8 caracteres. Si prefieres, también puedes entrar siempre con Google.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={mostrar ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="Nueva contraseña"
              className="w-full px-4 py-3 pr-12 rounded-xl text-sm outline-none border"
              style={inputStyle}
            />
            <button type="button" onClick={() => setMostrar(!mostrar)}
              aria-label={mostrar ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1" style={{ color: 'var(--muted)' }}>
              {mostrar ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <input
            type={mostrar ? 'text' : 'password'}
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            required
            autoComplete="new-password"
            placeholder="Repite la contraseña"
            className="w-full px-4 py-3 rounded-xl text-sm outline-none border"
            style={inputStyle}
          />

          {error && (
            <p className="text-sm px-4 py-3 rounded-xl" style={{ background: '#ff3b3015', color: 'var(--destructive)' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-60"
            style={{ background: 'var(--accent)', color: 'var(--accent-foreground)' }}>
            {loading ? 'Guardando...' : 'Guardar contraseña'}
          </button>
        </form>
      </div>
    </main>
  )
}
