'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { iniciarIntento } from '@/app/actions/taller'
import Button from '@/components/ui/Button'

export default function IniciarExamen({ examenId, texto, confirmar }: { examenId: string; texto: string; confirmar?: string }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  return (
    <div className="space-y-2">
      <Button type="button" size="lg" className="w-full" loading={pending} onClick={() => {
        if (confirmar && !window.confirm(confirmar)) return
        setError('')
        startTransition(async () => {
          const res = await iniciarIntento(examenId)
          if ('error' in res) setError(res.error)
          else router.push(`/taller/examenes/${examenId}/rendir/${res.intentoId}`)
        })
      }}>{texto}</Button>
      {error && <p role="alert" className="text-sm" style={{ color: 'var(--error)' }}>{error}</p>}
    </div>
  )
}
