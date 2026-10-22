'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'

type Datos = Record<string, string>
type Res = { success: true; id?: string } | { error: string }

// Envía los campos del formulario como objeto a una acción del servidor.
// `irA` admite "{id}" para redirigir al registro recién creado.
export default function FormAccion({
  accion, children, textoBoton, irA, limpiar = false, className = 'space-y-4',
}: {
  accion: (datos: never) => Promise<Res>
  children: React.ReactNode
  textoBoton: string
  irA?: string
  limpiar?: boolean
  className?: string
}) {
  const router = useRouter()
  const form = useRef<HTMLFormElement>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const datos = Object.fromEntries(new FormData(e.currentTarget).entries()) as Datos
    setError('')
    setOk(false)
    startTransition(async () => {
      const res = await accion(datos as never)
      if ('error' in res) { setError(res.error); return }
      if (irA) { router.push(irA.replace('{id}', res.id ?? '')); return }
      if (limpiar) form.current?.reset()
      setOk(true)
      router.refresh()
    })
  }

  return (
    <form ref={form} onSubmit={enviar} className={className}>
      {children}
      {error && (
        <p role="alert" className="text-sm px-3 py-2 rounded-lg"
          style={{ background: 'color-mix(in srgb, var(--error) 12%, transparent)', color: 'var(--error)' }}>
          {error}
        </p>
      )}
      {ok && !limpiar && <p role="status" className="text-sm" style={{ color: 'var(--success)' }}>Guardado.</p>}
      <Button type="submit" loading={pending}>{textoBoton}</Button>
    </form>
  )
}
