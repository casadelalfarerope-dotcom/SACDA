import { HeartHandshake, Phone, MapPin } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/service'
import { contextoEspacio } from '@/lib/espacio'
import { formatDate, hoyLima } from '@/lib/utils'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import { Pagina, Grupo, Fila, Vacio } from '@/components/ui/ios'
import AccionesVisita from '@/components/miembros/AccionesVisita'

// Visitas pastorales asignadas a la persona. Como un servidor no puede leer las
// fichas de otros, se usan datos de contacto solo de las visitas que le tocan.
export default async function MisVisitasPage() {
  const ctx = await contextoEspacio()
  const admin = createServiceClient()
  const hoy = hoyLima()
  const { data: visitas } = await admin.from('visitas_pastorales')
    .select('id, fecha, estado, motivo, nota, persona:personas!visitas_pastorales_persona_id_fkey(nombre_completo, foto_url, telefono, direccion)')
    .eq('responsable_id', ctx.personaId).order('fecha')

  type P = { nombre_completo: string; foto_url: string | null; telefono: string | null; direccion: string | null }
  const lista = (visitas ?? []).map((v) => ({ ...v, p: v.persona as unknown as P }))
  const pendientes = lista.filter((v) => v.estado === 'programada')
  const hechas = lista.filter((v) => v.estado !== 'programada').reverse().slice(0, 15)

  return (
    <Pagina ancho="estrecho" titulo="Mis visitas" subtitulo="Visitas pastorales que te asignaron">
      {!lista.length && <Vacio icono={<HeartHandshake size={44} />} titulo="No tienes visitas asignadas" />}

      {pendientes.length > 0 && (
        <Grupo titulo="Por hacer" pie="Después de la visita, márcala como realizada y cuenta brevemente cómo le fue.">
          {pendientes.map((v, i) => (
            <Fila key={v.id} primero={i === 0} inicio={<Avatar nombre={v.p.nombre_completo} fotoUrl={v.p.foto_url} size="sm" />}
              titulo={v.p.nombre_completo} subtitulo={formatDate(v.fecha)}
              detalle={v.fecha < hoy ? <Badge variant="error">Atrasada</Badge> : v.fecha === hoy ? <Badge variant="warning">Hoy</Badge> : undefined}>
              {v.motivo && <p className="text-[14px] mt-1" style={{ color: 'var(--foreground)' }}>{v.motivo}</p>}
              {v.p.telefono && (
                <a href={`tel:${v.p.telefono.replace(/\s/g, '')}`} className="flex items-center gap-1 text-[13px] mt-1" style={{ color: 'var(--accent)' }}>
                  <Phone size={12} aria-hidden="true" /> {v.p.telefono}
                </a>
              )}
              {v.p.direccion && (
                <a href={`https://maps.google.com/?q=${encodeURIComponent(v.p.direccion)}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[13px] mt-0.5" style={{ color: 'var(--accent)' }}>
                  <MapPin size={12} aria-hidden="true" /> {v.p.direccion}
                </a>
              )}
              <AccionesVisita id={v.id} />
            </Fila>
          ))}
        </Grupo>
      )}

      {hechas.length > 0 && (
        <Grupo titulo="Anteriores">
          {hechas.map((v, i) => (
            <Fila key={v.id} primero={i === 0} titulo={v.p.nombre_completo}
              subtitulo={formatDate(v.fecha)}
              detalle={<Badge variant={v.estado === 'realizada' ? 'success' : 'muted'}>{v.estado === 'realizada' ? 'Realizada' : 'Cancelada'}</Badge>}>
              {v.nota && <p className="text-[14px] mt-1" style={{ color: 'var(--foreground)' }}>{v.nota}</p>}
            </Fila>
          ))}
        </Grupo>
      )}
    </Pagina>
  )
}
