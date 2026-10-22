'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'

type Accion = () => Promise<{ success: true } | { error: string }>

export default function AccionBoton({
  accion, children, confirmar, variant = 'secondary', size = 'sm', className, ariaLabel, ariaPressed,
}: {
  accion: Accion
  children: React.ReactNode
  confirmar?: string
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive'
  size?: 'sm' | 'md'
  className?: string
  ariaLabel?: string
  ariaPressed?: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function ejecutar() {
    if (confirmar && !window.confirm(confirmar)) return
    setError('')
    startTransition(async () => {
      const res = await accion()
      if ('error' in res) setError(res.error)
      else router.refresh()
    })
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button type="button" variant={variant} size={size} loading={pending} onClick={ejecutar}
        className={className} aria-label={ariaLabel} aria-pressed={ariaPressed}>
        {children}
      </Button>
      {error && <span role="alert" className="text-xs" style={{ color: 'var(--error)' }}>{error}</span>}
    </span>
  )
}
