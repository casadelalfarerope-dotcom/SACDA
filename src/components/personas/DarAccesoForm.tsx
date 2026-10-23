'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, ShieldCheck, ShieldOff, Copy, Check, MessageCircle } from 'lucide-react'
import { invitarPersona, revocarAcceso } from '@/app/actions/invitaciones'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

interface Props {
  personaId: string
  emailSugerido?: string | null
  tieneAcceso: boolean
}

export default function DarAccesoForm({ personaId, emailSugerido, tieneAcceso }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)
  const [confirmRevocar, setConfirmRevocar] = useState(false)
  const [enlace, setEnlace] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)

  async function handleInvitar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    const fd = new FormData(e.currentTarget)
    const email = (fd.get('email') as string).trim()
    const res = await invitarPersona(personaId, email)
    setLoading(false)
    if (res.error) {
      setMsg({ type: 'error', text: res.error })
    } else {
      setEnlace(res.enlace ?? null)
      setMsg(res.correoEnviado
        ? { type: 'ok', text: `Enviamos la invitación a ${email}. Si no le llega, comparte el enlace de abajo.` }
        : { type: 'error', text: `La cuenta está creada, pero no se pudo enviar el correo. Comparte este enlace con la persona (por ejemplo, por WhatsApp).` })
      router.refresh()
    }
  }

  async function handleRevocar() {
    setLoading(true)
    setMsg(null)
    const res = await revocarAcceso(personaId)
    setLoading(false)
    setConfirmRevocar(false)
    if (res.error) {
      setMsg({ type: 'error', text: res.error })
    } else {
      setMsg({ type: 'ok', text: 'Acceso revocado correctamente.' })
      router.refresh()
    }
  }

  if (tieneAcceso) {
    return (
      <div className="animate-fade">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck size={15} style={{ color: 'var(--success)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
            Esta persona tiene acceso al sistema
          </p>
        </div>
        {msg && (
          <p className="text-sm mb-3 px-1" style={{ color: msg.type === 'ok' ? 'var(--success)' : 'var(--error)' }}>
            {msg.text}
          </p>
        )}
        {enlace && (
          <div className="mb-4 space-y-2">
            <p className="text-[13px]" style={{ color: 'var(--muted)' }}>Enlace de invitación (sirve una sola vez):</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={async () => {
                await navigator.clipboard.writeText(enlace)
                setCopiado(true)
                setTimeout(() => setCopiado(false), 2000)
              }}>
                {copiado ? <Check size={13} /> : <Copy size={13} />} {copiado ? 'Copiado' : 'Copiar enlace'}
              </Button>
              <a href={`https://wa.me/?text=${encodeURIComponent(`Hola, te invito al sistema de Casa del Alfarero. Activa tu cuenta aquí: ${enlace}`)}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full text-[13px] font-semibold"
                style={{ background: 'color-mix(in srgb, #25d366 18%, transparent)', color: '#1a9e4b' }}>
                <MessageCircle size={13} /> Enviar por WhatsApp
              </a>
            </div>
          </div>
        )}
        {!confirmRevocar ? (
          <Button variant="destructive" size="sm" onClick={() => setConfirmRevocar(true)}>
            <ShieldOff size={13} /> Revocar acceso
          </Button>
        ) : (
          <div className="flex items-center gap-3 animate-fade">
            <p className="text-sm" style={{ color: 'var(--muted)' }}>¿Confirmar revocación?</p>
            <Button variant="destructive" size="sm" loading={loading} onClick={handleRevocar}>Sí, revocar</Button>
            <Button variant="secondary" size="sm" onClick={() => setConfirmRevocar(false)}>Cancelar</Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleInvitar} className="animate-fade">
      <p className="text-sm mb-3" style={{ color: 'var(--muted)' }}>
        Envía una invitación por correo. Recibirá un enlace para activar su cuenta con Google o creando una contraseña.
      </p>
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Input
            name="email"
            type="email"
            label="Correo electrónico"
            placeholder="correo@ejemplo.com"
            defaultValue={emailSugerido ?? ''}
            required
          />
        </div>
        <Button type="submit" loading={loading} className="mb-0 flex-shrink-0">
          <Mail size={14} /> Invitar
        </Button>
      </div>
      {msg && (
        <p className="text-sm mt-2 px-1" style={{ color: msg.type === 'ok' ? 'var(--success)' : 'var(--error)' }}>
          {msg.text}
        </p>
      )}
    </form>
  )
}
