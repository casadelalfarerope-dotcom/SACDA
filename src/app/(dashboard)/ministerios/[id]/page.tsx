import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil, UserPlus, ExternalLink, Users } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import AgregarMiembroForm from '@/components/ministerios/AgregarMiembroForm'
import RemoverMiembroBtn from '@/components/ministerios/RemoverMiembroBtn'

export default async function DetalleGrupoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: grupo } = await supabase
    .from('grupos')
    .select(`*, encargado:personas(id, nombre_completo, foto_url), padre:grupos!grupo_padre_id(id, nombre)`)
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

  const encargado = Array.isArray(grupo.encargado) ? grupo.encargado[0] : grupo.encargado
  const padre = Array.isArray(grupo.padre) ? grupo.padre[0] : grupo.padre

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
      {/* Cabecera */}
      <div className="flex items-center gap-3">
        <Link href="/ministerios"
          className="p-2 rounded-xl" style={{ color: 'var(--muted)' }}>
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          {padre && (
            <p className="text-xs mb-0.5" style={{ color: 'var(--muted)' }}>
              Sub-grupo de {(padre as { nombre: string }).nombre}
            </p>
          )}
          <h1 className="text-2xl font-bold truncate" style={{ color: 'var(--foreground)' }}>
            {grupo.nombre}
          </h1>
        </div>
        <Link href={`/ministerios/${id}/editar`}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border"
          style={{ borderColor: 'var(--border)', color: 'var(--foreground)', background: 'var(--surface)' }}>
          <Pencil size={14} />
          Editar
        </Link>
      </div>

      {/* Info general */}
      <div className="rounded-2xl border p-5"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex flex-wrap gap-2 mb-3">
          <Badge label={grupo.tipo === 'servicio' ? 'Servicio' : 'Administrativo'} variant="default" />
          {!grupo.activo && <Badge label="Inactivo" variant="muted" />}
        </div>
        {grupo.descripcion && (
          <p className="text-sm mb-3" style={{ color: 'var(--muted)' }}>{grupo.descripcion}</p>
        )}
        {encargado && (
          <div className="flex items-center gap-2">
            <Avatar nombre={(encargado as { nombre_completo: string }).nombre_completo} size="sm" />
            <div>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Encargado</p>
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                {(encargado as { nombre_completo: string }).nombre_completo}
              </p>
            </div>
          </div>
        )}
        {grupo.enlace_whatsapp && (
          <a href={grupo.enlace_whatsapp} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 mt-3 text-sm font-medium"
            style={{ color: '#25d366' }}>
            <ExternalLink size={14} />
            Grupo de WhatsApp externo
          </a>
        )}
      </div>

      {/* Sub-grupos */}
      {subgrupos && subgrupos.length > 0 && (
        <div className="rounded-2xl border p-5"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--muted)' }}>SUB-GRUPOS</h2>
          <div className="flex flex-wrap gap-2">
            {subgrupos.map((s) => (
              <Link key={s.id} href={`/ministerios/${s.id}`}
                className="px-3 py-1.5 rounded-xl text-sm font-medium border transition-opacity hover:opacity-70"
                style={{ borderColor: 'var(--border)', color: 'var(--foreground)', background: 'var(--surface-secondary)' }}>
                {s.nombre}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Miembros */}
      <div className="rounded-2xl border p-5"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>
            MIEMBROS ({miembros?.length ?? 0})
          </h2>
        </div>

        {miembros && miembros.length > 0 ? (
          <div className="space-y-2 mb-4">
            {miembros.map((m) => {
              const persona = Array.isArray(m.persona) ? m.persona[0] : m.persona
              return (
                <div key={m.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: 'var(--surface-secondary)' }}>
                  {persona && (
                    <Avatar nombre={(persona as { nombre_completo: string }).nombre_completo}
                      fotoUrl={(persona as { foto_url: string | null }).foto_url} size="sm" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                      {persona ? (persona as { nombre_completo: string }).nombre_completo : '—'}
                    </p>
                    {m.rol_en_grupo && (
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>{m.rol_en_grupo}</p>
                    )}
                  </div>
                  <RemoverMiembroBtn miembroId={m.id} grupoId={id} />
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
            Sin miembros aún.
          </p>
        )}

        <AgregarMiembroForm grupoId={id} />
      </div>

      {/* Materiales recientes */}
      {materiales && materiales.length > 0 && (
        <div className="rounded-2xl border p-5"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--muted)' }}>
            MATERIALES RECIENTES
          </h2>
          <div className="space-y-2">
            {materiales.map((mat) => (
              <a key={mat.id} href={mat.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-opacity hover:opacity-70"
                style={{ background: 'var(--surface-secondary)' }}>
                <ExternalLink size={14} style={{ color: 'var(--muted)' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                    {mat.titulo}
                  </p>
                  <p className="text-xs capitalize" style={{ color: 'var(--muted)' }}>{mat.tipo}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
