import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { UserCheck, Pencil } from 'lucide-react'
import { Pagina, Grupo, Fila, Tarjeta, BotonEnlace } from '@/components/ui/ios'
import { formatDate } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import AsignarServidorForm from '@/components/servidores/AsignarServidorForm'
import AsignacionItem from '@/components/servidores/AsignacionItem'
import PublicarBtn from '@/components/servidores/PublicarBtn'
import SugerirRotacionForm from '@/components/servidores/SugerirRotacionForm'
import { calcularSugerenciaRotacion, confirmarRotacion } from '@/app/actions/servidores'

export default async function ProgramaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: programa } = await supabase
    .from('programas')
    .select('*')
    .eq('id', id)
    .single()

  if (!programa) notFound()

  const [{ data: asignaciones }, { data: roles }, { data: personas }, { sugerencias }] = await Promise.all([
    supabase
      .from('programa_asignaciones')
      .select('*, roles_servicio(nombre, color), personas(nombre_completo, foto_url)')
      .eq('programa_id', id)
      .order('created_at'),
    supabase.from('roles_servicio').select('*').eq('activo', true).order('orden'),
    supabase.from('personas').select('id, nombre_completo').eq('estado', 'activo').order('nombre_completo'),
    calcularSugerenciaRotacion(id),
  ])

  const porRol = new Map<string, typeof asignaciones>()
  for (const a of asignaciones ?? []) {
    const rid = (a.roles_servicio as any)?.nombre ?? 'Sin rol'
    if (!porRol.has(rid)) porRol.set(rid, [])
    porRol.get(rid)!.push(a)
  }

  return (
    <Pagina titulo={programa.titulo} subtitulo={formatDate(programa.fecha)} volver={{ href: '/servidores', texto: 'Servidores' }}
      acciones={<>
        <Badge variant={programa.estado === 'publicado' ? 'success' : 'warning'}>
          {programa.estado === 'publicado' ? 'Publicado' : 'Borrador'}
        </Badge>
        <BotonEnlace href={`/servidores/${programa.id}/editar`} variante="tintado"><Pencil size={14} aria-hidden="true" /> Editar</BotonEnlace>
        {programa.estado === 'borrador' && <PublicarBtn programaId={programa.id} />}
      </>}>

      {(roles ?? []).map((rol) => {
        const asigs = (asignaciones ?? []).filter((a) => (a.roles_servicio as { nombre: string } | null)?.nombre === rol.nombre)
        return (
          <Grupo key={rol.id}
            titulo={<span className="inline-flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" aria-hidden="true" style={{ background: rol.color }} />
              {rol.nombre}{rol.requiere_material ? ' · requiere material' : ''}
            </span>}>
            {asigs.length === 0 ? (
              <Fila primero titulo={<span style={{ color: 'var(--muted)' }}>Sin asignar</span>} />
            ) : asigs.map((a, i) => (
              <li key={a.id} className={`px-4 py-2 ${i ? 'border-t' : ''}`} style={{ borderColor: 'var(--border)' }}>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <AsignacionItem asignacion={a as any} programaId={programa.id} requiereMaterial={rol.requiere_material} />
              </li>
            ))}
          </Grupo>
        )
      })}

      {sugerencias && sugerencias.length > 0 && programa.estado === 'borrador' && (
        <SugerirRotacionForm
          programaId={programa.id}
          sugerencias={sugerencias}
          onConfirmar={async (asigs) => {
            'use server'
            await confirmarRotacion(programa.id, asigs)
          }}
        />
      )}

      <Tarjeta titulo="Agregar servidor">
        <AsignarServidorForm programaId={programa.id} roles={roles ?? []} personas={personas ?? []} />
      </Tarjeta>
    </Pagina>
  )
}
