'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import Button from '@/components/ui/Button'
import { completarProximos } from '@/app/actions/servidores'

// Llena con sugerencia todos los cultos del próximo mes que el ministerio aún no completó.
export default function CompletarProximosBtn({ grupoId, eventoId }: { grupoId: string; eventoId?: string }) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  return (
    <div className="space-y-1.5">
      <Button size="sm" variant="secondary" loading={pendiente} onClick={() => {
        setMensaje(null)
        iniciar(async () => {
          const res = await completarProximos(grupoId, 31, eventoId)
          setMensaje(res.error ? { tipo: 'error', texto: res.error } : { tipo: 'ok', texto: `Listo: ${res.cantidad} turnos sugeridos. Revisa cada fecha y publícala.` })
          router.refresh()
        })
      }}>
        <Sparkles size={14} aria-hidden="true" /> Completar el próximo mes
      </Button>
      {mensaje && (
        <p role={mensaje.tipo === 'error' ? 'alert' : 'status'} className="text-[13px]"
          style={{ color: mensaje.tipo === 'error' ? 'var(--error)' : 'var(--success)' }}>{mensaje.texto}</p>
      )}
    </div>
  )
}
