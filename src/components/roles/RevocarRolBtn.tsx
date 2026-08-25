'use client'

import { useTransition } from 'react'
import { X } from 'lucide-react'
import { revocarRol } from '@/app/actions/roles'

export default function RevocarRolBtn({ asignacionId }: { asignacionId: string }) {
  const [isPending, startTransition] = useTransition()

  function handle() {
    if (!confirm('¿Revocar este rol?')) return
    startTransition(() => revocarRol(asignacionId))
  }

  return (
    <button onClick={handle} disabled={isPending}
      title="Revocar rol"
      className="p-0.5 rounded-full hover:opacity-70 transition-opacity disabled:opacity-30">
      <X size={12} style={{ color: 'var(--error)' }} />
    </button>
  )
}
