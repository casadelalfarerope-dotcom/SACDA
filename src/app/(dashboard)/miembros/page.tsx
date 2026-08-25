import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Cake, Church, UserX, UserPlus } from 'lucide-react'
import { diasParaCumpleanios, formatDateShort } from '@/lib/utils'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'

export default async function MiembrosPage() {
  const supabase = await createClient()

  // Cumpleaños próximos (30 días)
  const { data: todasPersonas } = await supabase
    .from('personas')
    .select('id, nombre_completo, foto_url, fecha_nacimiento, ministerio')
    .eq('estado', 'activo')
    .not('fecha_nacimiento', 'is', null)
    .order('nombre_completo')

  const cumpleProximos = (todasPersonas ?? [])
    .map((p) => ({ ...p, diasFaltan: diasParaCumpleanios(p.fecha_nacimiento!) }))
    .filter((p) => p.diasFaltan <= 30)
    .sort((a, b) => a.diasFaltan - b.diasFaltan)
    .slice(0, 8)

  // Visitas pendientes de seguimiento
  const { data: visitas } = await supabase
    .from('seguimiento_visitas')
    .select('*, persona:personas(id, nombre_completo, foto_url, ministerio)')
    .eq('estado', 'pendiente')
    .order('fecha_primera_visita', { ascending: false })
    .limit(10)

  // Ausencias pendientes
  const { data: ausencias } = await supabase
    .from('ausencias')
    .select('*, persona:personas(id, nombre_completo, foto_url)')
    .eq('estado', 'pendiente')
    .order('fecha', { ascending: false })
    .limit(10)

  // Ceremonias recientes
  const { data: ceremonias } = await supabase
    .from('ceremonias')
    .select('*, ceremonia_personas(rol_en_ceremonia, nombre_externo, persona:personas(nombre_completo))')
    .order('fecha', { ascending: false })
    .limit(5)

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
          Gestión de Miembros
        </h1>
        <div className="flex gap-2">
          <Link href="/miembros/ceremonias/nueva"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-opacity hover:opacity-70"
            style={{ borderColor: 'var(--border)', color: 'var(--foreground)', background: 'var(--surface)' }}>
            <Church size={15} />
            Ceremonia
          </Link>
          <Link href="/miembros/ausencias/nueva"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-opacity hover:opacity-70"
            style={{ borderColor: 'var(--border)', color: 'var(--foreground)', background: 'var(--surface)' }}>
            <UserX size={15} />
            Ausencia
          </Link>
          <Link href="/miembros/visitas/nueva"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-80"
            style={{ background: 'var(--accent)' }}>
            <UserPlus size={15} />
            <span className="hidden sm:inline">Visita</span>
          </Link>
        </div>
      </div>

      {/* Cumpleaños próximos */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Cake size={18} style={{ color: 'var(--accent)' }} />
          <h2 className="font-semibold" style={{ color: 'var(--foreground)' }}>
            Cumpleaños próximos
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: 'var(--surface-secondary)', color: 'var(--muted)' }}>
            30 días
          </span>
        </div>

        {cumpleProximos.length === 0 ? (
          <p className="text-sm py-4 text-center" style={{ color: 'var(--muted)' }}>
            Sin cumpleaños en los próximos 30 días.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {cumpleProximos.map((p) => (
              <Link key={p.id} href={`/congregantes/${p.id}`}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all hover:shadow-sm"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <Avatar nombre={p.nombre_completo} fotoUrl={p.foto_url} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                    {p.nombre_completo}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>
                    {p.ministerio ?? 'Sin ministerio'}
                  </p>
                </div>
                <span className="text-xs font-semibold px-2 py-1 rounded-lg"
                  style={{
                    background: p.diasFaltan === 0 ? '#34c75920' : p.diasFaltan <= 7 ? '#ff950020' : 'var(--surface-secondary)',
                    color: p.diasFaltan === 0 ? 'var(--success)' : p.diasFaltan <= 7 ? 'var(--warning)' : 'var(--muted)',
                  }}>
                  {p.diasFaltan === 0 ? 'Hoy' : `${p.diasFaltan}d`}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visitas pendientes */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <UserPlus size={18} style={{ color: 'var(--accent)' }} />
              <h2 className="font-semibold" style={{ color: 'var(--foreground)' }}>
                Visitas · seguimiento
              </h2>
            </div>
            <Link href="/miembros/visitas" className="text-xs"
              style={{ color: 'var(--accent)' }}>
              Ver todas
            </Link>
          </div>

          {!visitas || visitas.length === 0 ? (
            <div className="rounded-2xl border p-4 text-center"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>Sin visitas pendientes</p>
            </div>
          ) : (
            <div className="space-y-2">
              {visitas.map((v) => {
                const persona = Array.isArray(v.persona) ? v.persona[0] : v.persona
                return (
                  <Link key={v.id} href="/miembros/visitas"
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl border"
                    style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                    {persona && (
                      <Avatar nombre={persona.nombre_completo} fotoUrl={persona.foto_url} size="sm" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                        {persona?.nombre_completo ?? '—'}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>
                        Primera visita: {formatDateShort(v.fecha_primera_visita)}
                      </p>
                    </div>
                    <Badge label="Pendiente" variant="warning" />
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {/* Ausencias pendientes */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <UserX size={18} style={{ color: 'var(--destructive)' }} />
              <h2 className="font-semibold" style={{ color: 'var(--foreground)' }}>
                Ausencias · seguimiento
              </h2>
            </div>
            <Link href="/miembros/ausencias" className="text-xs"
              style={{ color: 'var(--accent)' }}>
              Ver todas
            </Link>
          </div>

          {!ausencias || ausencias.length === 0 ? (
            <div className="rounded-2xl border p-4 text-center"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>Sin ausencias pendientes</p>
            </div>
          ) : (
            <div className="space-y-2">
              {ausencias.map((a) => {
                const persona = Array.isArray(a.persona) ? a.persona[0] : a.persona
                return (
                  <div key={a.id}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl border"
                    style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                    {persona && (
                      <Avatar nombre={persona.nombre_completo} fotoUrl={persona.foto_url} size="sm" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                        {persona?.nombre_completo ?? '—'}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>
                        {formatDateShort(a.fecha)}
                        {a.motivo ? ` · ${a.motivo}` : ''}
                      </p>
                    </div>
                    <Badge label="Pendiente" variant="warning" />
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {/* Ceremonias recientes */}
      {ceremonias && ceremonias.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Church size={18} style={{ color: 'var(--accent)' }} />
              <h2 className="font-semibold" style={{ color: 'var(--foreground)' }}>
                Ceremonias recientes
              </h2>
            </div>
            <Link href="/miembros/ceremonias" className="text-xs"
              style={{ color: 'var(--accent)' }}>
              Ver todas
            </Link>
          </div>
          <div className="space-y-2">
            {ceremonias.map((c) => {
              const tipoMap = { bautismo: 'Bautismo', dedicacion: 'Dedicación', boda: 'Boda' } as const
              const tipoLabel = tipoMap[c.tipo as keyof typeof tipoMap] ?? c.tipo
              const nombres = (c.ceremonia_personas ?? [])
                .map((cp: { nombre_externo?: string | null; persona?: { nombre_completo: string } | null }) =>
                  cp.persona?.nombre_completo ?? cp.nombre_externo ?? ''
                )
                .filter(Boolean)
                .join(', ')
              return (
                <div key={c.id}
                  className="flex items-center gap-4 px-4 py-3 rounded-2xl border"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                      {tipoLabel}
                      {nombres ? ` — ${nombres}` : ''}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>
                      {formatDateShort(c.fecha)}
                      {c.officiante ? ` · Oficia: ${c.officiante}` : ''}
                    </p>
                  </div>
                  <Badge
                    label={tipoLabel}
                    variant={c.tipo === 'bautismo' ? 'default' : c.tipo === 'boda' ? 'success' : 'warning'}
                  />
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
