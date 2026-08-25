'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCheck } from 'lucide-react'
import { marcarTodasLeidas } from '@/app/actions/notificaciones'

export default function MarcarLeidasBtn({ personaId }: { personaId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handle() {
    setLoading(true)
    await marcarTodasLeidas(personaId)
    router.refresh()
    setLoading(false)
  }

  return (
    <button onClick={handle} disabled={loading}
      className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-opacity hover:opacity-70 disabled:opacity-40"
      style={{ borderColor: 'var(--border)', color: 'var(--foreground)', background: 'var(--surface)' }}>
      <CheckCheck size={15} />
      Marcar todas
    </button>
  )
}
