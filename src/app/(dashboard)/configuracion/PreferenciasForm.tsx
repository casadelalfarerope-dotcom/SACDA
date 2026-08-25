'use client'

import { useState, useEffect } from 'react'
import { Moon, Sun } from 'lucide-react'

export default function PreferenciasForm() {
  const [tema, setTema] = useState<'light' | 'dark' | 'system'>('system')

  useEffect(() => {
    const saved = localStorage.getItem('tema') as typeof tema | null
    if (saved) setTema(saved)
  }, [])

  function cambiarTema(t: typeof tema) {
    setTema(t)
    localStorage.setItem('tema', t)
    const root = document.documentElement
    if (t === 'dark') root.setAttribute('data-theme', 'dark')
    else if (t === 'light') root.setAttribute('data-theme', 'light')
    else root.removeAttribute('data-theme')
  }

  const opciones: { value: typeof tema; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Claro', icon: <Sun size={14} /> },
    { value: 'system', label: 'Sistema', icon: <span className="text-xs font-bold">A</span> },
    { value: 'dark', label: 'Oscuro', icon: <Moon size={14} /> },
  ]

  return (
    <div className="space-y-3">
      <p className="text-xs" style={{ color: 'var(--muted)' }}>Tema de la interfaz</p>
      <div className="flex gap-2">
        {opciones.map((op) => (
          <button key={op.value} onClick={() => cambiarTema(op.value)}
            className="flex-1 flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-medium transition-all"
            style={{
              background: tema === op.value ? 'var(--accent)' : 'var(--surface-secondary)',
              borderColor: tema === op.value ? 'var(--accent)' : 'var(--border)',
              color: tema === op.value ? '#fff' : 'var(--foreground)',
            }}>
            {op.icon}
            {op.label}
          </button>
        ))}
      </div>
      <p className="text-xs" style={{ color: 'var(--muted)' }}>
        "Sistema" sigue la preferencia de tu dispositivo automáticamente.
      </p>
    </div>
  )
}
