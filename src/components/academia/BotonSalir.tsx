'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function BotonSalir() {
  const router = useRouter()
  async function salir() {
    await createClient().auth.signOut()
    router.push('/login')
    router.refresh()
  }
  return (
    <button type="button" onClick={salir} aria-label="Cerrar sesión" className="p-2 rounded-xl hover:opacity-70" style={{ color: 'var(--muted)' }}>
      <LogOut size={18} />
    </button>
  )
}
