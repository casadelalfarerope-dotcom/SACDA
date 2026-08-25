'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send } from 'lucide-react'
import { publicarPrograma } from '@/app/actions/servidores'

export default function PublicarBtn({ programaId }: { programaId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handle() {
    setLoading(true)
    await publicarPrograma(programaId)
    router.refresh()
    setLoading(false)
  }

  return (
    <button onClick={handle} disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium text-white disabled:opacity-50 transition-opacity hover:opacity-80"
      style={{ background: 'var(--accent)' }}>
      <Send size={13} />
      {loading ? 'Publicando...' : 'Publicar'}
    </button>
  )
}
