'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle } from 'lucide-react'
import { marcarTutorialVisto } from '@/app/actions/tutoriales'

export default function MarcarVistoBtn({ tutorialId, personaId }: { tutorialId: string; personaId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handle() {
    setLoading(true)
    await marcarTutorialVisto(tutorialId, personaId)
    router.refresh()
    setLoading(false)
  }

  return (
    <button onClick={handle} disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium text-white disabled:opacity-50"
      style={{ background: '#16a34a' }}>
      <CheckCircle size={14} />
      {loading ? '...' : 'Marcar como visto'}
    </button>
  )
}
