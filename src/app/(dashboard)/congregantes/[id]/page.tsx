import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Pencil, Phone, Mail, MessageCircle } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import { Pagina, Grupo, Fila, Tarjeta, BotonEnlace } from '@/components/ui/ios'
import { formatDate, formatDateShort, calcularEdad } from '@/lib/utils'
import type { EstadoPersona } from '@/types/database'
import DarAccesoForm from '@/components/personas/DarAccesoForm'

const estadoLabel: Record<EstadoPersona, { label: string; variant: 'success' | 'muted' | 'warning' }> = {
  activo:   { label: 'Activo',   variant: 'success' },
  inactivo: { label: 'Inactivo', variant: 'muted' },
  visita:   { label: 'Visita',   variant: 'warning' },
}

function AccionContacto({ href, icon: Icon, texto }: { href: string; icon: React.ElementType; texto: string }) {
  return (
    <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer"
      className="flex-1 max-w-[110px] flex flex-col items-center gap-1 py-2.5 rounded-2xl transition-[filter] hover:brightness-95"
      style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-card)', color: 'var(--accent)' }}>
      <Icon size={20} aria-hidden="true" />
      <span className="text-[12px] font-medium">{texto}</span>
    </a>
  )
}

export default async function DetalleCongregantePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: persona } = await supabase.from('personas').select('*').eq('id', id).single()
  if (!persona) notFound()

  const [{ data: roles }, { data: cuenta }] = await Promise.all([
    supabase.from('roles_asignados').select('id, rol:roles(nombre)').eq('persona_id', id).eq('activo', true),
    supabase.from('cuentas').select('id').eq('persona_id', id).maybeSingle(),
  ])

  const estado = estadoLabel[persona.estado as EstadoPersona]
  const telefono = persona.telefono?.replace(/[^\d+]/g, '')
  const whatsapp = telefono ? (telefono.startsWith('+') ? telefono.slice(1) : telefono.length === 9 ? `51${telefono}` : telefono) : null

  const datos = [
    { t: 'DNI', v: persona.dni },
    { t: 'Nacimiento', v: persona.fecha_nacimiento ? `${formatDate(persona.fecha_nacimiento)} · ${calcularEdad(persona.fecha_nacimiento)} años` : null },
    { t: 'Teléfono', v: persona.telefono },
    { t: 'Correo', v: persona.email },
    { t: 'Dirección', v: persona.direccion },
  ].filter((d) => d.v)

  return (
    <Pagina ancho="estrecho" volver={{ href: '/congregantes', texto: 'Congregantes' }}
      acciones={<BotonEnlace href={`/congregantes/${id}/editar`} variante="tintado"><Pencil size={15} aria-hidden="true" /> Editar</BotonEnlace>}>

      <div className="flex flex-col items-center text-center gap-2 -mt-4">
        <Avatar nombre={persona.nombre_completo} fotoUrl={persona.foto_url} size="lg" className="w-24! h-24! text-3xl!" />
        <h1 className="mt-1 text-center" style={{ color: 'var(--foreground)' }}>{persona.nombre_completo}</h1>
        <div className="flex items-center gap-2">
          {persona.ministerio && <span className="text-[15px]" style={{ color: 'var(--muted)' }}>{persona.ministerio}</span>}
          <Badge variant={estado.variant}>{estado.label}</Badge>
        </div>
      </div>

      {(telefono || persona.email) && (
        <div className="flex justify-center gap-3">
          {telefono && <AccionContacto href={`tel:${telefono}`} icon={Phone} texto="Llamar" />}
          {whatsapp && <AccionContacto href={`https://wa.me/${whatsapp}`} icon={MessageCircle} texto="WhatsApp" />}
          {persona.email && <AccionContacto href={`mailto:${persona.email}`} icon={Mail} texto="Correo" />}
        </div>
      )}

      {datos.length > 0 && (
        <Grupo titulo="Datos personales">
          {datos.map((d, i) => (
            <Fila key={d.t} primero={i === 0} titulo={<span className="text-[13px]" style={{ color: 'var(--muted)' }}>{d.t}</span>}>
              <span className="block text-[15px] break-words" style={{ color: 'var(--foreground)' }}>{d.v}</span>
            </Fila>
          ))}
        </Grupo>
      )}

      {!!roles?.length && (
        <Grupo titulo="Roles">
          <Fila primero>
            <span className="flex flex-wrap gap-1.5">
              {roles.map((r) => <Badge key={r.id} variant="default">{(r.rol as unknown as { nombre: string } | null)?.nombre}</Badge>)}
            </span>
          </Fila>
        </Grupo>
      )}

      {persona.notas && (
        <Grupo titulo="Notas internas">
          <Fila primero><span className="block text-[15px] whitespace-pre-wrap" style={{ color: 'var(--foreground)' }}>{persona.notas}</span></Fila>
        </Grupo>
      )}

      <Tarjeta titulo="Acceso al sistema">
        <DarAccesoForm personaId={id} emailSugerido={persona.email} tieneAcceso={!!cuenta} />
      </Tarjeta>

      <p className="text-[13px] text-center" style={{ color: 'var(--muted)' }}>Registrado el {formatDateShort(persona.created_at)}</p>
    </Pagina>
  )
}
