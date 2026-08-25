'use client'

import { useState } from 'react'
import { Mail, ShieldCheck, ShieldOff } from 'lucide-react'
import { invitarPersona, revocarAcceso } from '@/app/actions/invitaciones'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

interface Props {
  personaId: string
  emailSugerido?: string | null
  tieneAcceso: boolean
}

export default function DarAccesoForm({ personaId, emailSugerido, tieneAcceso }: Props) {
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)
  const [confirmRevocar, setConfirmRevocar] = useState(false)

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
      setMsg({ type: 'ok', text: `Invitación enviada a ${email}. El hermano recibirá un correo para crear su contraseña.` })
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
        Envía una invitación por correo. El hermano recibirá un enlace para crear su contraseña.
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
