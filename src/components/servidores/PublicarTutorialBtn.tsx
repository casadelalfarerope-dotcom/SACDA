'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { publicarTutorial } from '@/app/actions/tutoriales'

export default function PublicarTutorialBtn({ tutorialId, publicado }: { tutorialId: string; publicado: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handle() {
    setLoading(true)
    await publicarTutorial(tutorialId, !publicado)
    router.refresh()
    setLoading(false)
  }

  return (
    <button onClick={handle} disabled={loading}
      className="px-3 py-1.5 rounded-xl text-sm font-medium border transition-opacity hover:opacity-70 disabled:opacity-40"
      style={{
        borderColor: publicado ? 'var(--border)' : 'var(--accent)',
        color: publicado ? 'var(--muted)' : 'var(--accent)',
        background: 'var(--surface)',
      }}>
      {loading ? '...' : publicado ? 'Despublicar' : 'Publicar'}
    </button>
  )
}
