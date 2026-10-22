'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { enviarResumen } from '@/app/actions/taller'
import Button from '@/components/ui/Button'

const MINIMO = 80

export default function ResumenForm({ sesionId, inicial, reenviar }: { sesionId: string; inicial: string; reenviar: boolean }) {
  const router = useRouter()
  const [texto, setTexto] = useState(inicial)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const faltan = Math.max(0, MINIMO - texto.trim().length)

  function enviar(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      const res = await enviarResumen(sesionId, texto)
      if ('error' in res) setError(res.error)
      else router.refresh()
    })
  }

  return (
    <form onSubmit={enviar} className="space-y-2">
      <label htmlFor="resumen" className="block text-sm font-medium" style={{ color: 'var(--foreground)' }}>
        ¿Qué aprendiste en esta clase?
      </label>
      <textarea id="resumen" value={texto} onChange={(e) => setTexto(e.target.value)} rows={6} required
        aria-describedby="resumen-ayuda"
        className="w-full px-4 py-3 rounded-xl text-sm outline-none border resize-y border-[color:var(--border)] focus:border-[color:var(--accent)]"
        style={{ background: 'var(--surface)', color: 'var(--foreground)' }}
        placeholder="Escribe con tus palabras las ideas principales de la clase…" />
      <p id="resumen-ayuda" className="text-xs" style={{ color: 'var(--muted)' }}>
        {faltan > 0 ? `Escribe al menos ${faltan} caracteres más.` : 'Listo para enviar.'}
      </p>
      {error && <p role="alert" className="text-sm" style={{ color: 'var(--error)' }}>{error}</p>}
      <Button type="submit" loading={pending} disabled={faltan > 0}>{reenviar ? 'Volver a enviar' : 'Enviar resumen'}</Button>
    </form>
  )
}
