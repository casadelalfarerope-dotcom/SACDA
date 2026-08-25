'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { removerMiembro } from '@/app/actions/ministerios'

export default function RemoverMiembroBtn({ miembroId, grupoId }: { miembroId: string; grupoId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleRemover() {
    if (!confirm('¿Remover este miembro del grupo?')) return
    setLoading(true)
    await removerMiembro(miembroId, grupoId)
    router.refresh()
    setLoading(false)
  }

  return (
    <button onClick={handleRemover} disabled={loading}
      className="p-1.5 rounded-lg transition-opacity hover:opacity-70 disabled:opacity-30"
      style={{ color: 'var(--muted)' }}>
      <X size={15} />
    </button>
  )
}
