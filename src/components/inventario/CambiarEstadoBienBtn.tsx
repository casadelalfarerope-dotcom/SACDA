'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { actualizarEstadoBien } from '@/app/actions/inventario'
import Button from '@/components/ui/Button'

const ESTADOS = ['bueno', 'regular', 'malo', 'baja']

export default function CambiarEstadoBienBtn({ bienId, estadoActual }: { bienId: string; estadoActual: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handle(estado: string) {
    if (estado === estadoActual) return
    setLoading(true)
    await actualizarEstadoBien(bienId, estado)
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {ESTADOS.map((e) => (
        <Button key={e} size="sm" variant={e === estadoActual ? 'primary' : 'secondary'}
          loading={loading && e !== estadoActual}
          onClick={() => handle(e)}>
          {e.replace('_', ' ')}
        </Button>
      ))}
    </div>
  )
}
