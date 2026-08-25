import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil, Phone, Mail, MapPin, Calendar, Hash, ShieldCheck } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import { formatDateShort, calcularEdad } from '@/lib/utils'
import type { EstadoPersona } from '@/types/database'
import DarAccesoForm from '@/components/personas/DarAccesoForm'

const estadoLabel: Record<EstadoPersona, { label: string; variant: 'success' | 'muted' | 'warning' }> = {
  activo:   { label: 'Activo',   variant: 'success' },
  inactivo: { label: 'Inactivo', variant: 'muted' },
  visita:   { label: 'Visita',   variant: 'warning' },
}

function Campo({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-0"
      style={{ borderColor: 'var(--border)' }}>
      <Icon size={16} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--muted)' }} />
      <div>
        <p className="text-xs mb-0.5" style={{ color: 'var(--muted)' }}>{label}</p>
        <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{value}</p>
      </div>
    </div>
  )
}

export default async function DetalleCongregantePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: persona } = await supabase
    .from('personas')
    .select('*')
    .eq('id', id)
    .single()

  if (!persona) notFound()

  // Roles activos de esta persona
  const [{ data: roles }, { data: cuenta }] = await Promise.all([
    supabase
      .from('roles_asignados')
      .select('*, rol:roles(nombre, descripcion)')
      .eq('persona_id', id)
      .eq('activo', true),
    supabase
      .from('cuentas')
      .select('id')
      .eq('persona_id', id)
      .maybeSingle(),
  ])

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto stagger">
      {/* Navegación */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/congregantes"
          className="p-2 rounded-xl transition-opacity hover:opacity-70"
          style={{ color: 'var(--muted)' }}>
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold flex-1 truncate" style={{ color: 'var(--foreground)' }}>
          Detalle
        </h1>
        <Link href={`/congregantes/${id}/editar`}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-opacity hover:opacity-70"
          style={{ borderColor: 'var(--border)', color: 'var(--foreground)', background: 'var(--surface)' }}>
          <Pencil size={14} />
          Editar
        </Link>
      </div>

      {/* Encabezado de perfil */}
      <div className="rounded-2xl border p-5 mb-4 flex items-center gap-4"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <Avatar nombre={persona.nombre_completo} fotoUrl={persona.foto_url} size="lg" />
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold truncate" style={{ color: 'var(--foreground)' }}>
            {persona.nombre_completo}
          </h2>
          {persona.ministerio && (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>{persona.ministerio}</p>
          )}
          <div className="mt-2">
            <Badge
              label={estadoLabel[persona.estado as keyof typeof estadoLabel].label}
              variant={estadoLabel[persona.estado as keyof typeof estadoLabel].variant}
            />
          </div>
        </div>
      </div>

      {/* Datos personales */}
      <div className="rounded-2xl border p-5 mb-4"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--muted)' }}>
          DATOS PERSONALES
        </h3>
        <Campo icon={Hash} label="DNI" value={persona.dni} />
        <Campo
          icon={Calendar}
          label="Fecha de nacimiento"
          value={persona.fecha_nacimiento
            ? `${formatDateShort(persona.fecha_nacimiento)} (${calcularEdad(persona.fecha_nacimiento)} años)`
            : null}
        />
        <Campo icon={Phone} label="Teléfono / WhatsApp" value={persona.telefono} />
        <Campo icon={Mail} label="Correo electrónico" value={persona.email} />
        <Campo icon={MapPin} label="Dirección" value={persona.direccion} />
      </div>

      {/* Roles */}
      {roles && roles.length > 0 && (
        <div className="rounded-2xl border p-5 mb-4"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--muted)' }}>
            ROLES ASIGNADOS
          </h3>
          <div className="flex flex-wrap gap-2">
            {roles.map((ra) => (
              <Badge key={ra.id} label={ra.rol?.nombre ?? ''} variant="default" />
            ))}
          </div>
        </div>
      )}

      {/* Notas */}
      {persona.notas && (
        <div className="rounded-2xl border p-5"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--muted)' }}>
            NOTAS INTERNAS
          </h3>
          <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--foreground)' }}>
            {persona.notas}
          </p>
        </div>
      )}

      {/* Acceso al sistema */}
      <div className="rounded-2xl border p-5"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck size={15} style={{ color: 'var(--muted)' }} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>
            ACCESO AL SISTEMA
          </h3>
        </div>
        <DarAccesoForm
          personaId={id}
          emailSugerido={persona.email}
          tieneAcceso={!!cuenta}
        />
      </div>

      {/* Metadata */}
      <p className="text-xs text-center mt-4" style={{ color: 'var(--muted)' }}>
        Registrado el {formatDateShort(persona.created_at)}
      </p>
    </div>
  )
}
