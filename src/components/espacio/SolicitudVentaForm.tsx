'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { solicitarVenta } from '@/app/actions/espacio'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Button from '@/components/ui/Button'

export default function SolicitudVentaForm({ hoy }: { hoy: string }) {
  const router = useRouter()
  const [titulo, setTitulo] = useState('')
  const [detalle, setDetalle] = useState('')
  const [fecha, setFecha] = useState('')
  const [error, setError] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!titulo.trim()) { setError('Indica qué quieres vender.'); return }
    if (!fecha) { setError('Elige la fecha en que quieres vender.'); return }
    setEnviando(true)
    const res = await solicitarVenta({ titulo, detalle, fecha })
    setEnviando(false)
    if (res.error) { setError(res.error); return }
    setTitulo(''); setDetalle(''); setFecha('')
    setEnviado(true)
    router.refresh()
  }

  return (
    <form onSubmit={enviar} className="space-y-4" noValidate>
      <Input label="¿Qué quieres vender? *" placeholder="Ej. Empanadas para la actividad de jóvenes" maxLength={120}
        value={titulo} onChange={(e) => { setTitulo(e.target.value); setEnviado(false) }} />
      <Input label="Fecha del culto *" type="date" min={hoy} value={fecha} onChange={(e) => { setFecha(e.target.value); setEnviado(false) }} />
      <Textarea label="Detalle (opcional)" placeholder="Precio, para qué es lo recaudado, qué necesitas…" rows={3}
        value={detalle} onChange={(e) => setDetalle(e.target.value)} />
      {error && <p role="alert" className="text-[13px]" style={{ color: 'var(--error)' }}>{error}</p>}
      {enviado && <p role="status" className="text-[13px]" style={{ color: 'var(--success)' }}>Enviamos tu solicitud. Te avisaremos cuando la revisen.</p>}
      <Button type="submit" loading={enviando}>Enviar solicitud</Button>
    </form>
  )
}
