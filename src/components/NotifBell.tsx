import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Bell } from 'lucide-react'

export default async function NotifBell({ personaId }: { personaId: string | null }) {
  if (!personaId) return null

  const supabase = await createClient()
  const { count } = await supabase
    .from('notificaciones')
    .select('*', { count: 'exact', head: true })
    .eq('persona_id', personaId)
    .eq('leida', false)

  const sinLeer = count ?? 0

  return (
    <Link href="/notificaciones"
      className="relative p-2 rounded-xl transition-opacity hover:opacity-70"
      style={{ color: 'var(--foreground)' }}>
      <Bell size={20} />
      {sinLeer > 0 && (
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center rounded-full text-white text-[10px] font-bold"
          style={{ background: 'var(--destructive)' }}>
          {sinLeer > 9 ? '9+' : sinLeer}
        </span>
      )}
    </Link>
  )
}
