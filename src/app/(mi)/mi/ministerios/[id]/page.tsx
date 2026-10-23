import { notFound } from 'next/navigation'
import { Mic2, MessageCircle, ExternalLink, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { contextoEspacio, misMinisterios } from '@/lib/espacio'
import { asegurarProgramas } from '@/lib/programas'
import { formatDate, hoyLima } from '@/lib/utils'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import { IconoModulo } from '@/components/ui/IconoApp'
import { Pagina, Grupo, Fila } from '@/components/ui/ios'
import CompletarProximosBtn from '@/components/programas/CompletarProximosBtn'
import PuestosMinisterio from '@/components/programas/PuestosMinisterio'

const fechaCorta = (f: string, h: string | null) => `${formatDate(f)}${h ? ` · ${h.slice(0, 5)}` : ''}`

export default async function MiMinisterioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await contextoEspacio()
  const mio = (await misMinisterios(ctx.personaId)).find((m) => m.id === id)
  if (!mio) notFound()

  // La persona integra este ministerio: se leen sus datos con el cliente de servicio.
  const admin = createServiceClient()
  const supabase = await createClient()
  const hoy = hoyLima()
  if (mio.esLider) await asegurarProgramas(admin)

  const [{ data: grupo }, { data: miembros }, { data: subgrupos }, { data: materiales }, { data: puestos }] = await Promise.all([
    admin.from('grupos').select('nombre, descripcion, enlace_whatsapp, encargado_id, lider:personas!grupos_encargado_id_fkey(nombre_completo, foto_url)').eq('id', id).single(),
    admin.from('grupo_miembros').select('persona_id, rol_en_grupo, persona:personas(nombre_completo, foto_url)').eq('grupo_id', id).eq('activo', true),
    admin.from('grupos').select('id, nombre').eq('grupo_padre_id', id).eq('activo', true),
    admin.from('grupo_materiales').select('id, titulo, url').eq('grupo_id', id).order('created_at', { ascending: false }).limit(5),
    admin.from('roles_servicio').select('id, nombre, cantidad, modo, requiere_material, puesto_candidatos(persona_id, orden)')
      .eq('grupo_id', id).eq('activo', true).order('orden'),
  ])
  if (!grupo) notFound()
  const lider = grupo.lider as unknown as { nombre_completo: string; foto_url: string | null } | null
  const puestoIds = (puestos ?? []).map((p) => p.id as string)

  // Próximos cultos con el avance de este ministerio.
  const [{ data: programas }, { data: asignaciones }, { data: estados }] = await Promise.all([
    admin.from('programas').select('id, titulo, fecha, hora_inicio').gte('fecha', hoy).eq('cancelado', false)
      .order('fecha').order('hora_inicio').limit(mio.esLider ? 40 : 12),
    puestoIds.length
      ? admin.from('programa_asignaciones').select('programa_id, rol_servicio_id, persona:personas(nombre_completo)').in('rol_servicio_id', puestoIds)
      : Promise.resolve({ data: [] as never[] }),
    admin.from('programa_ministerios').select('programa_id, estado').eq('grupo_id', id),
  ])
  const necesarios = (puestos ?? []).reduce((n, p) => n + (p.cantidad as number), 0)
  const publicado = new Set((estados ?? []).filter((e) => e.estado === 'publicado').map((e) => e.programa_id))
  const nombrePuesto = new Map((puestos ?? []).map((p) => [p.id as string, p.nombre as string]))

  const integrantes = (miembros ?? []).map((m) => ({
    id: m.persona_id as string, rol: m.rol_en_grupo as string | null,
    ...(m.persona as unknown as { nombre_completo: string; foto_url: string | null }),
  }))
  const opciones = [...integrantes.map((m) => ({ id: m.id, nombre: m.nombre_completo }))]
  if (grupo.encargado_id && lider && !opciones.some((o) => o.id === grupo.encargado_id)) opciones.push({ id: grupo.encargado_id, nombre: lider.nombre_completo })
  opciones.sort((a, b) => a.nombre.localeCompare(b.nombre))

  return (
    <Pagina ancho="estrecho" titulo={mio.nombre} volver={{ href: '/mi/ministerios', texto: 'Mis ministerios' }}
      subtitulo={mio.esLider ? 'Eres el líder de este ministerio' : mio.padre ? `Subgrupo de ${mio.padre}` : undefined}>
      {grupo.descripcion && <p className="text-[15px]" style={{ color: 'var(--foreground)' }}>{grupo.descripcion}</p>}

      {mio.esLider ? (
        <section className="space-y-2" aria-labelledby="prog-titulo">
          <div className="flex flex-wrap items-end justify-between gap-2 px-4">
            <h2 id="prog-titulo" className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Programación</h2>
          </div>
          {puestoIds.length > 0 && <div className="px-1"><CompletarProximosBtn grupoId={id} /></div>}
          <Grupo pie={puestoIds.length ? 'Abre un culto para asignar, repetir los del culto anterior o publicar.' : 'Primero define los puestos de tu ministerio (abajo).'}>
            {(programas ?? []).map((p, i) => {
              const n = (asignaciones ?? []).filter((a) => a.programa_id === p.id).length
              const estado = publicado.has(p.id) ? 'publicado' : n ? 'borrador' : 'vacio'
              return (
                <Fila key={p.id} primero={i === 0} href={puestoIds.length ? `/mi/ministerios/${id}/culto/${p.id}` : undefined}
                  inicio={<IconoModulo icon={Mic2} color={estado === 'publicado' ? '#34c759' : '#ff2d55'} tamano={36} />}
                  titulo={p.titulo} subtitulo={fechaCorta(p.fecha, p.hora_inicio)}
                  detalle={estado === 'publicado' ? <Badge variant="success">Publicado</Badge>
                    : <Badge variant={n ? 'warning' : 'muted'}>{n}/{necesarios}</Badge>} />
              )
            })}
            {!programas?.length && <Fila primero titulo={<span style={{ color: 'var(--muted)' }}>No hay cultos en el calendario</span>} />}
          </Grupo>
        </section>
      ) : (
        <Grupo titulo="Quién sirve en los próximos cultos">
          {(programas ?? []).filter((p) => publicado.has(p.id)).map((p, i) => {
            const del = (asignaciones ?? []).filter((a) => a.programa_id === p.id)
            return (
              <Fila key={p.id} primero={i === 0} titulo={p.titulo} subtitulo={fechaCorta(p.fecha, p.hora_inicio)}>
                <span className="block text-[13px] mt-1 whitespace-normal" style={{ color: 'var(--foreground)' }}>
                  {del.map((a) => `${nombrePuesto.get(a.rol_servicio_id as string)}: ${(a.persona as unknown as { nombre_completo: string } | null)?.nombre_completo ?? '—'}`).join(' · ')}
                </span>
              </Fila>
            )
          })}
          {!(programas ?? []).some((p) => publicado.has(p.id)) && (
            <Fila primero titulo={<span style={{ color: 'var(--muted)' }}>El líder aún no publica la programación</span>} />
          )}
        </Grupo>
      )}

      {mio.esLider && (
        <section className="space-y-1.5" aria-labelledby="puestos-titulo">
          <h2 id="puestos-titulo" className="px-4 text-[13px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Puestos de tu ministerio</h2>
          <PuestosMinisterio grupoId={id} integrantes={opciones}
            puestos={(puestos ?? []).map((p) => ({
              id: p.id, nombre: p.nombre, cantidad: p.cantidad, modo: p.modo, requiere_material: p.requiere_material,
              candidatos: ((p.puesto_candidatos ?? []) as { persona_id: string; orden: number }[]).sort((a, b) => a.orden - b.orden).map((c) => c.persona_id),
            }))} />
        </section>
      )}

      <Grupo titulo={`Integrantes (${integrantes.length + (lider && !integrantes.some((m) => m.id === grupo.encargado_id) ? 1 : 0)})`}>
        {lider && (
          <Fila primero inicio={<Avatar nombre={lider.nombre_completo} fotoUrl={lider.foto_url} size="sm" />}
            titulo={lider.nombre_completo} detalle={<Badge variant="info">Líder</Badge>} />
        )}
        {integrantes.filter((m) => m.id !== grupo.encargado_id).map((m, i) => (
          <Fila key={m.id} primero={!lider && i === 0} inicio={<Avatar nombre={m.nombre_completo} fotoUrl={m.foto_url} size="sm" />}
            titulo={m.nombre_completo} subtitulo={m.rol ?? undefined} />
        ))}
      </Grupo>

      {!!subgrupos?.length && (
        <Grupo titulo="Subgrupos">
          {subgrupos.map((s, i) => <Fila key={s.id} primero={i === 0} inicio={<IconoModulo icon={Users} color="#5856d6" />} titulo={s.nombre} />)}
        </Grupo>
      )}

      {(grupo.enlace_whatsapp || !!materiales?.length) && (
        <Grupo titulo="Enlaces y material">
          {grupo.enlace_whatsapp && (
            <Fila primero inicio={<IconoModulo icon={MessageCircle} color="#25d366" />}>
              <a href={grupo.enlace_whatsapp} target="_blank" rel="noopener noreferrer" className="block text-[15px] font-medium" style={{ color: 'var(--accent)' }}>Grupo de WhatsApp</a>
            </Fila>
          )}
          {(materiales ?? []).map((m, i) => (
            <Fila key={m.id} primero={!grupo.enlace_whatsapp && i === 0} inicio={<IconoModulo icon={ExternalLink} color="#007aff" />}>
              <a href={m.url} target="_blank" rel="noopener noreferrer" className="block text-[15px] font-medium truncate" style={{ color: 'var(--accent)' }}>{m.titulo}</a>
            </Fila>
          ))}
        </Grupo>
      )}
    </Pagina>
  )
}
