import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, UserCheck } from 'lucide-react'
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
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/servidores"
          className="p-2 rounded-xl hover:opacity-70 transition-opacity"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <ArrowLeft size={18} style={{ color: 'var(--foreground)' }} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate" style={{ color: 'var(--foreground)' }}>{programa.titulo}</h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>{formatDate(programa.fecha)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={programa.estado === 'publicado' ? 'success' : 'warning'}>
            {programa.estado === 'publicado' ? 'Publicado' : 'Borrador'}
          </Badge>
          {programa.estado === 'borrador' && <PublicarBtn programaId={programa.id} />}
        </div>
      </div>

      <div className="grid gap-6">
        {/* Lista de asignaciones agrupadas por rol */}
        {(roles ?? []).map((rol) => {
          const asigs = (asignaciones ?? []).filter((a) => (a.roles_servicio as any)?.nombre === rol.nombre)
          return (
            <div key={rol.id} className="p-4 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-3 h-3 rounded-full" style={{ background: rol.color }} />
                <span className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>{rol.nombre}</span>
                {rol.requiere_material && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-secondary)', color: 'var(--muted)' }}>
                    requiere material
                  </span>
                )}
              </div>

              {asigs.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--muted)' }}>Sin asignar</p>
              ) : (
                <div className="space-y-2 mb-3">
                  {asigs.map((a) => (
                    <AsignacionItem
                      key={a.id}
                      asignacion={a as any}
                      programaId={programa.id}
                      requiereMaterial={rol.requiere_material}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {/* Rotación sugerida */}
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

        {/* Formulario para agregar asignación */}
        <div className="p-4 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Plus size={16} style={{ color: 'var(--accent)' }} />
            <span className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>Agregar servidor</span>
          </div>
          <AsignarServidorForm
            programaId={programa.id}
            roles={roles ?? []}
            personas={personas ?? []}
          />
        </div>
      </div>
    </div>
  )
}
