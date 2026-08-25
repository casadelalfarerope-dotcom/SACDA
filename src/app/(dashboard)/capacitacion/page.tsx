import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, PlayCircle, BookOpen } from 'lucide-react'
import Badge from '@/components/ui/Badge'

const destinoLabel: Record<string, string> = {
  pantalla_principal: 'Pantalla principal',
  redes_sociales: 'Redes sociales',
  general: 'General',
}

export default async function CapacitacionPage() {
  const supabase = await createClient()

  const { data: tutoriales } = await supabase
    .from('tutoriales')
    .select('*, roles_servicio(nombre, color), tutorial_progreso(visto)')
    .order('created_at', { ascending: false })

  const publicados = tutoriales?.filter((t) => t.publicado) ?? []
  const borradores = tutoriales?.filter((t) => !t.publicado) ?? []

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Capacitación</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>Tutoriales por área de servicio</p>
        </div>
        <Link href="/capacitacion/nuevo"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-80"
          style={{ background: 'var(--accent)' }}>
          <Plus size={16} /> Nuevo
        </Link>
      </div>

      {publicados.length > 0 && (
        <section className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>Publicados</p>
          <div className="grid gap-3">
            {publicados.map((t) => {
              const vistos = (t.tutorial_progreso as any[]).filter((p) => p.visto).length
              return (
                <Link key={t.id} href={`/capacitacion/${t.id}`}
                  className="flex items-start gap-4 p-4 rounded-2xl border transition-opacity hover:opacity-80"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--surface-secondary)' }}>
                    <PlayCircle size={20} style={{ color: 'var(--accent)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>{t.titulo}</p>
                    {t.descripcion && <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--muted)' }}>{t.descripcion}</p>}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {t.roles_servicio && (
                        <span className="text-xs px-2 py-0.5 rounded-full text-white"
                          style={{ background: (t.roles_servicio as any).color }}>
                          {(t.roles_servicio as any).nombre}
                        </span>
                      )}
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-secondary)', color: 'var(--muted)' }}>
                        {destinoLabel[t.tipo_destino] ?? t.tipo_destino}
                      </span>
                      {vistos > 0 && (
                        <span className="text-xs" style={{ color: 'var(--muted)' }}>{vistos} lo vieron</span>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {borradores.length > 0 && (
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>Borradores</p>
          <div className="grid gap-2">
            {borradores.map((t) => (
              <Link key={t.id} href={`/capacitacion/${t.id}`}
                className="flex items-center gap-3 p-4 rounded-2xl border opacity-60 transition-opacity hover:opacity-80"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <BookOpen size={16} style={{ color: 'var(--muted)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{t.titulo}</span>
                <Badge variant="warning">Borrador</Badge>
              </Link>
            ))}
          </div>
        </section>
      )}

      {(!tutoriales || tutoriales.length === 0) && (
        <div className="text-center py-16">
          <BookOpen size={36} className="mx-auto mb-3" style={{ color: 'var(--muted)' }} />
          <p className="font-medium" style={{ color: 'var(--foreground)' }}>Sin tutoriales aún</p>
          <p className="text-sm mt-1 mb-4" style={{ color: 'var(--muted)' }}>Agrega el primer material de capacitación</p>
          <Link href="/capacitacion/nuevo"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'var(--accent)' }}>
            <Plus size={15} /> Nuevo tutorial
          </Link>
        </div>
      )}
    </div>
  )
}
