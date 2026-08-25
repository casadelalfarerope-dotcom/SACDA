'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { confirmarDistribucion } from '@/app/actions/tareas'

export default function ConfirmarDistribucionBtn({ id, tareaId }: { id: string; tareaId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handle() {
    setLoading(true)
    await confirmarDistribucion(id, tareaId)
    router.refresh()
    setLoading(false)
  }

  return (
    <button onClick={handle} disabled={loading}
      className="px-3 py-1.5 rounded-xl text-xs font-medium text-white disabled:opacity-50"
      style={{ background: 'var(--accent)' }}>
      {loading ? '...' : 'Confirmar recibo'}
    </button>
  )
}
