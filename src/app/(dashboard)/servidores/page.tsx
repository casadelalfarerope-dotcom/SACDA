import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Calendar, Users, ChevronRight } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import Badge from '@/components/ui/Badge'

const estadoLabel: Record<string, string> = { borrador: 'Borrador', publicado: 'Publicado' }
const estadoColor: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  borrador: 'warning',
  publicado: 'success',
}

export default async function ServidoresPage() {
  const supabase = await createClient()

  const { data: programas } = await supabase
    .from('programas')
    .select('*, programa_asignaciones(id)')
    .order('fecha', { ascending: false })
    .limit(50)

  const proximos = programas?.filter((p) => p.fecha >= new Date().toISOString().split('T')[0]!) ?? []
  const pasados = programas?.filter((p) => p.fecha < new Date().toISOString().split('T')[0]!) ?? []

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Programación</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>Servidores por culto</p>
        </div>
        <div className="flex gap-2">
          <Link href="/servidores/roles"
            className="px-3 py-2 rounded-xl text-sm font-medium border transition-opacity hover:opacity-70"
            style={{ borderColor: 'var(--border)', color: 'var(--foreground)', background: 'var(--surface)' }}>
            Roles
          </Link>
          <Link href="/servidores/nuevo"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-80"
            style={{ background: 'var(--accent)' }}>
            <Plus size={16} />
            Nuevo
          </Link>
        </div>
      </div>

      {proximos.length > 0 && (
        <section className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>
            Próximos
          </p>
          <div className="space-y-2">
            {proximos.map((p) => (
              <Link key={p.id} href={`/servidores/${p.id}`}
                className="flex items-center gap-4 p-4 rounded-2xl border transition-opacity hover:opacity-80"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--accent)', opacity: 0.15 }}>
                  <Calendar size={18} style={{ color: 'var(--accent)', opacity: 1 }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: 'var(--foreground)' }}>{p.titulo}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{formatDate(p.fecha)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted)' }}>
                    <Users size={13} />
                    {(p.programa_asignaciones as any[]).length}
                  </div>
                  <Badge variant={estadoColor[p.estado] ?? 'default'}>{estadoLabel[p.estado] ?? p.estado}</Badge>
                  <ChevronRight size={16} style={{ color: 'var(--muted)' }} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {pasados.length > 0 && (
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>
            Anteriores
          </p>
          <div className="space-y-2">
            {pasados.slice(0, 10).map((p) => (
              <Link key={p.id} href={`/servidores/${p.id}`}
                className="flex items-center gap-4 p-4 rounded-2xl border transition-opacity hover:opacity-80 opacity-60"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate" style={{ color: 'var(--foreground)' }}>{p.titulo}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{formatDate(p.fecha)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted)' }}>
                    <Users size={13} />
                    {(p.programa_asignaciones as any[]).length}
                  </div>
                  <ChevronRight size={16} style={{ color: 'var(--muted)' }} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {(!programas || programas.length === 0) && (
        <div className="text-center py-16">
          <Calendar size={36} className="mx-auto mb-3" style={{ color: 'var(--muted)' }} />
          <p className="font-medium" style={{ color: 'var(--foreground)' }}>Sin programas aún</p>
          <p className="text-sm mt-1 mb-4" style={{ color: 'var(--muted)' }}>Crea el primer programa de servidores</p>
          <Link href="/servidores/nuevo"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'var(--accent)' }}>
            <Plus size={15} /> Nuevo programa
          </Link>
        </div>
      )}
    </div>
  )
}
