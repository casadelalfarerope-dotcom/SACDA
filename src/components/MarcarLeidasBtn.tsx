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
    <button type="button" onClick={handle} disabled={loading}
      className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-[14px] font-semibold transition-[filter] hover:brightness-95 disabled:opacity-40"
      style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)' }}>
      <CheckCheck size={15} aria-hidden="true" />
      Marcar todas
    </button>
  )
}
