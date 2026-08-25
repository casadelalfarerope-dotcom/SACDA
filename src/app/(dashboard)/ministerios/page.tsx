import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Users, ChevronRight, ExternalLink } from 'lucide-react'
import Badge from '@/components/ui/Badge'

export default async function MinisteriosPage() {
  const supabase = await createClient()

  // Grupos raíz (sin padre)
  const { data: grupos } = await supabase
    .from('grupos')
    .select(`
      *,
      encargado:personas(nombre_completo),
      subgrupos:grupos!grupo_padre_id(id, nombre, activo),
      miembros:grupo_miembros(id)
    `)
    .is('grupo_padre_id', null)
    .eq('activo', true)
    .order('nombre')

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
            Ministerios y Grupos
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
            {grupos?.length ?? 0} ministerios activos
          </p>
        </div>
        <Link href="/ministerios/nuevo"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'var(--accent)' }}>
          <Plus size={16} />
          <span className="hidden sm:inline">Nuevo</span>
        </Link>
      </div>

      <div className="space-y-3">
        {grupos?.map((g) => {
          const encargado = Array.isArray(g.encargado) ? g.encargado[0] : g.encargado
          const subgrupos = (g.subgrupos ?? []) as { id: string; nombre: string; activo: boolean }[]
          const totalMiembros = (g.miembros ?? []).length

          return (
            <div key={g.id}
              className="rounded-2xl border overflow-hidden"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <Link href={`/ministerios/${g.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:opacity-80 transition-opacity">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ background: 'var(--accent)' }}>
                  {g.nombre.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate" style={{ color: 'var(--foreground)' }}>
                    {g.nombre}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs flex items-center gap-1" style={{ color: 'var(--muted)' }}>
                      <Users size={12} />
                      {totalMiembros} miembro{totalMiembros !== 1 ? 's' : ''}
                    </span>
                    {encargado && (
                      <span className="text-xs" style={{ color: 'var(--muted)' }}>
                        Encargado: {encargado.nombre_completo.split(' ')[0]}
                      </span>
                    )}
                    <Badge
                      label={g.tipo === 'servicio' ? 'Servicio' : 'Administrativo'}
                      variant={g.tipo === 'servicio' ? 'default' : 'muted'}
                    />
                  </div>
                </div>
                <ChevronRight size={18} style={{ color: 'var(--muted)' }} />
              </Link>

              {/* Sub-grupos */}
              {subgrupos.filter(s => s.activo).length > 0 && (
                <div className="border-t px-5 py-3 flex flex-wrap gap-2"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface-secondary)' }}>
                  {subgrupos.filter(s => s.activo).map((sub) => (
                    <Link key={sub.id} href={`/ministerios/${sub.id}`}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-opacity hover:opacity-70"
                      style={{ background: 'var(--surface)', color: 'var(--foreground)', border: '1px solid var(--border)' }}>
                      {sub.nombre}
                      <ChevronRight size={12} style={{ color: 'var(--muted)' }} />
                    </Link>
                  ))}
                </div>
              )}

              {/* Enlace WhatsApp */}
              {g.enlace_whatsapp && (
                <div className="border-t px-5 py-2.5"
                  style={{ borderColor: 'var(--border)' }}>
                  <a href={g.enlace_whatsapp} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs font-medium"
                    style={{ color: '#25d366' }}>
                    <ExternalLink size={13} />
                    Grupo de WhatsApp
                  </a>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
