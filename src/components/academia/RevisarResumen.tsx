'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { revisarResumen } from '@/app/actions/academia'
import Button from '@/components/ui/Button'

export default function RevisarResumen({ resumenId, nombre }: { resumenId: string; nombre: string }) {
  const router = useRouter()
  const [comentario, setComentario] = useState('')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  function revisar(estado: 'aprobado' | 'rechazado') {
    if (estado === 'rechazado' && !comentario.trim()) {
      setError('Escribe un comentario para que el alumno sepa qué corregir.')
      return
    }
    setError('')
    startTransition(async () => {
      const res = await revisarResumen(resumenId, estado, comentario)
      if ('error' in res) setError(res.error)
      else router.refresh()
    })
  }

  return (
    <div className="space-y-2">
      <label className="sr-only" htmlFor={`com-${resumenId}`}>Comentario para {nombre}</label>
      <textarea id={`com-${resumenId}`} rows={2} value={comentario} onChange={(e) => setComentario(e.target.value)}
        placeholder="Comentario para el alumno (obligatorio si lo rechazas)"
        className="w-full px-3 py-2 rounded-xl text-sm outline-none border border-[color:var(--border)] focus:border-[color:var(--accent)]"
        style={{ background: 'var(--surface)', color: 'var(--foreground)' }} />
      {error && <p role="alert" className="text-xs" style={{ color: 'var(--error)' }}>{error}</p>}
      <div className="flex gap-2">
        <Button type="button" size="sm" loading={pending} onClick={() => revisar('aprobado')}>Aprobar</Button>
        <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={() => revisar('rechazado')}>Pedir cambios</Button>
      </div>
    </div>
  )
}
