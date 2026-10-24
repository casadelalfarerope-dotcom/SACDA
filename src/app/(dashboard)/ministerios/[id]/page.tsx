import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Pencil, ExternalLink, Users, MessageCircle } from 'lucide-react'
import { IconoModulo } from '@/components/ui/IconoApp'
import { Pagina, Grupo, Fila, Tarjeta, BotonEnlace } from '@/components/ui/ios'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import AgregarMiembroForm from '@/components/ministerios/AgregarMiembroForm'
import RemoverMiembroBtn from '@/components/ministerios/RemoverMiembroBtn'
import PuestosMinisterio from '@/components/programas/PuestosMinisterio'

export default async function DetalleGrupoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: grupo } = await supabase
    .from('grupos')
    .select(`*, encargado:personas(id, nombre_completo, foto_url)`)
    .eq('id', id)
    .single()

  if (!grupo) notFound()

  const { data: miembros } = await supabase
    .from('grupo_miembros')
    .select('*, persona:personas(id, nombre_completo, foto_url, ministerio)')
    .eq('grupo_id', id)
    .eq('activo', true)
    .order('created_at')

  const { data: subgrupos } = await supabase
    .from('grupos')
    .select('id, nombre, activo')
    .eq('grupo_padre_id', id)

  const { data: materiales } = await supabase
    .from('grupo_materiales')
    .select('*')
    .eq('grupo_id', id)
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: puestos } = await supabase.from('roles_servicio')
    .select('id, nombre, cantidad, modo, requiere_material, puesto_candidatos(persona_id, orden)')
    .eq('grupo_id', id).eq('activo', true).order('orden')

  const encargado = Array.isArray(grupo.encargado) ? grupo.encargado[0] : grupo.encargado
  // El ministerio "padre" se busca aparte (la relación de la tabla consigo misma es ambigua).
  const { data: padre } = grupo.grupo_padre_id
    ? await supabase.from('grupos').select('id, nombre').eq('id', grupo.grupo_padre_id).maybeSingle()
    : { data: null }

  const enc = encargado as { nombre_completo: string; foto_url?: string | null } | null
  return (
    <Pagina titulo={grupo.nombre}
      subtitulo={[grupo.tipo === 'servicio' ? 'Ministerio de servicio' : 'Administrativo', padre && `Subgrupo de ${(padre as { nombre: string }).nombre}`, !grupo.activo && 'Inactivo'].filter(Boolean).join(' · ')}
      volver={{ href: '/ministerios', texto: 'Ministerios' }}
      acciones={<BotonEnlace href={`/ministerios/${id}/editar`} variante="tintado"><Pencil size={14} aria-hidden="true" /> Editar</BotonEnlace>}>

      {grupo.descripcion && <p className="text-[15px] leading-relaxed" style={{ color: 'var(--foreground)' }}>{grupo.descripcion}</p>}

      {(enc || grupo.enlace_whatsapp) && (
        <Grupo>
          {enc && (
            <Fila primero inicio={<Avatar nombre={enc.nombre_completo} fotoUrl={enc.foto_url ?? null} size="sm" />}
              titulo={enc.nombre_completo} subtitulo="Líder del ministerio" />
          )}
          {grupo.enlace_whatsapp && (
            <Fila primero={!enc} inicio={<IconoModulo icon={MessageCircle} color="#25d366" />}>
              <a href={grupo.enlace_whatsapp} target="_blank" rel="noopener noreferrer" className="block text-[15px] font-medium" style={{ color: 'var(--accent)' }}>
                Abrir grupo de WhatsApp
              </a>
            </Fila>
          )}
        </Grupo>
      )}

      {!!subgrupos?.length && (
        <Grupo titulo="Subgrupos">
          {subgrupos.map((s, i) => (
            <Fila key={s.id} href={`/ministerios/${s.id}`} primero={i === 0} inicio={<IconoModulo icon={Users} color="#5856d6" />}
              titulo={s.nombre} detalle={!s.activo ? <Badge variant="muted">Inactivo</Badge> : undefined} />
          ))}
        </Grupo>
      )}

      <div className="space-y-2">
        <Grupo titulo={`Miembros (${miembros?.length ?? 0})`}>
          {(miembros ?? []).map((m, i) => {
            const persona = (Array.isArray(m.persona) ? m.persona[0] : m.persona) as { nombre_completo: string; foto_url: string | null } | null
            return (
              <Fila key={m.id} primero={i === 0}
                inicio={persona ? <Avatar nombre={persona.nombre_completo} fotoUrl={persona.foto_url} size="sm" /> : undefined}
                titulo={persona?.nombre_completo ?? '—'} subtitulo={m.rol_en_grupo ?? undefined}
                detalle={<RemoverMiembroBtn miembroId={m.id} grupoId={id} />} />
            )
          })}
          {!miembros?.length && <Fila primero titulo={<span style={{ color: 'var(--muted)' }}>Sin miembros aún</span>} />}
        </Grupo>
        <Tarjeta titulo="Agregar miembro"><AgregarMiembroForm grupoId={id} /></Tarjeta>
      </div>

      {grupo.tipo === 'servicio' && (() => {
        const integrantes = (miembros ?? []).map((m) => {
          const p = (Array.isArray(m.persona) ? m.persona[0] : m.persona) as { id: string; nombre_completo: string } | null
          return { id: m.persona_id as string, nombre: p?.nombre_completo ?? '—' }
        })
        if (grupo.encargado_id && enc && !integrantes.some((x) => x.id === grupo.encargado_id)) {
          integrantes.push({ id: grupo.encargado_id, nombre: enc.nombre_completo })
        }
        return (
          <section className="space-y-1.5" aria-labelledby="puestos-titulo">
            <h2 id="puestos-titulo" className="px-4 text-[13px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Puestos en el culto</h2>
            <p className="px-4 text-[13px]" style={{ color: 'var(--muted)' }}>Lo que este ministerio cubre en cada culto. El líder asigna a las personas en cada programa.</p>
            <PuestosMinisterio grupoId={id} integrantes={integrantes.sort((a, b) => a.nombre.localeCompare(b.nombre))}
              puestos={(puestos ?? []).map((p) => ({
                id: p.id, nombre: p.nombre, cantidad: p.cantidad, modo: p.modo, requiere_material: p.requiere_material,
                candidatos: ((p.puesto_candidatos ?? []) as { persona_id: string; orden: number }[]).sort((a, b) => a.orden - b.orden).map((c) => c.persona_id),
              }))} />
          </section>
        )
      })()}

      {!!materiales?.length && (
        <Grupo titulo="Materiales recientes">
          {materiales.map((mat, i) => (
            <Fila key={mat.id} primero={i === 0} inicio={<IconoModulo icon={ExternalLink} color="#a35d2d" />} subtitulo={<span className="capitalize">{mat.tipo}</span>}>
              <a href={mat.url} target="_blank" rel="noopener noreferrer" className="block text-[15px] font-medium truncate" style={{ color: 'var(--accent)' }}>{mat.titulo}</a>
            </Fila>
          ))}
        </Grupo>
      )}
    </Pagina>
  )
}
