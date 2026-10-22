'use client'

import { useTransition } from 'react'
import { revocarRol } from '@/app/actions/roles'

export default function RevocarRolBtn({ asignacionId }: { asignacionId: string }) {
  const [isPending, startTransition] = useTransition()

  function handle() {
    if (!confirm('¿Revocar este rol?')) return
    startTransition(async () => { await revocarRol(asignacionId) })
  }

  return (
    <button type="button" onClick={handle} disabled={isPending} aria-label="Quitar rol"
      className="text-[15px] font-medium hover:opacity-70 transition-opacity disabled:opacity-30"
      style={{ color: 'var(--error)' }}>
      Quitar
    </button>
  )
}
