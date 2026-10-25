import { GraduationCap, CheckCircle2 } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/service'
import { contextoEspacio, misMinisterios } from '@/lib/espacio'
import Badge from '@/components/ui/Badge'
import { IconoModulo } from '@/components/ui/IconoApp'
import { Pagina, Grupo, Fila, Vacio } from '@/components/ui/ios'
import MarcarVistoBtn from '@/components/servidores/MarcarVistoBtn'

const DESTINO: Record<string, string> = { pantalla_principal: 'Pantalla principal', redes_sociales: 'Redes sociales' }

// Tutoriales para servir: los de cada ministerio de la persona y los generales.
export default async function MiCapacitacionPage() {
  const ctx = await contextoEspacio()
  const ministerios = await misMinisterios(ctx.personaId)
  const ids = ministerios.map((m) => m.id)
  const admin = createServiceClient()
  const filtro = ids.length ? `grupo_id.is.null,grupo_id.in.(${ids.join(',')})` : 'grupo_id.is.null'
  const [{ data: tutoriales }, { data: progreso }] = await Promise.all([
    admin.from('tutoriales').select('id, titulo, descripcion, url_contenido, tipo_destino, grupo_id')
      .eq('publicado', true).or(filtro).order('created_at', { ascending: false }),
    admin.from('tutorial_progreso').select('tutorial_id').eq('persona_id', ctx.personaId).eq('visto', true),
  ])
  const vistos = new Set((progreso ?? []).map((p) => p.tutorial_id as string))
  const lista = tutoriales ?? []
  const hechos = lista.filter((t) => vistos.has(t.id)).length

  // Agrupados por ministerio; los generales al final.
  const secciones = [
    ...ministerios.map((m) => ({ titulo: m.padre ? `${m.padre} · ${m.nombre}` : m.nombre, items: lista.filter((t) => t.grupo_id === m.id) })),
    { titulo: 'Para todos los servidores', items: lista.filter((t) => !t.grupo_id) },
  ].filter((s) => s.items.length)

  return (
    <Pagina ancho="estrecho" titulo="Capacitación" subtitulo="Tutoriales para servir mejor en tu ministerio">
      {lista.length > 0 && (
        <section aria-label="Avance" className="rounded-2xl border p-4 space-y-2" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <p className="text-[15px]" style={{ color: 'var(--foreground)' }}>
            <b className="text-[22px] tabular-nums">{hechos}</b> <span style={{ color: 'var(--muted)' }}>de {lista.length} tutoriales vistos</span>
          </p>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--fill)' }} role="progressbar"
            aria-valuenow={hechos} aria-valuemin={0} aria-valuemax={lista.length} aria-label="Tutoriales vistos">
            <div className="h-full rounded-full" style={{ width: `${Math.round((hechos / lista.length) * 100)}%`, background: 'var(--success)' }} />
          </div>
        </section>
      )}

      {!lista.length && <Vacio icono={<GraduationCap size={44} />} titulo="Aún no hay tutoriales"
        texto="Cuando el líder de tu ministerio comparta un tutorial, aparecerá aquí." />}

      {secciones.map((s) => (
        <Grupo key={s.titulo} titulo={s.titulo}>
          {s.items.map((tu, i) => {
            const visto = vistos.has(tu.id)
            return (
              <Fila key={tu.id} primero={i === 0}
                inicio={<IconoModulo icon={visto ? CheckCircle2 : GraduationCap} color={visto ? '#34c759' : '#32ade6'} tamano={36} />}
                titulo={tu.titulo}
                subtitulo={[DESTINO[tu.tipo_destino], tu.descripcion].filter(Boolean).join(' · ') || undefined}>
                <span className="flex flex-wrap items-center gap-3 mt-2">
                  {tu.url_contenido && (
                    <a href={tu.url_contenido} target="_blank" rel="noopener noreferrer" className="text-[13px] font-medium underline" style={{ color: 'var(--accent)' }}>Abrir tutorial</a>
                  )}
                  {visto ? <Badge variant="success">Visto</Badge> : <MarcarVistoBtn tutorialId={tu.id} personaId={ctx.personaId} />}
                </span>
              </Fila>
            )
          })}
        </Grupo>
      ))}
    </Pagina>
  )
}
