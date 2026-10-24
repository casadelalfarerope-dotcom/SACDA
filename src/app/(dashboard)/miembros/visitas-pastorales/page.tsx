import { House } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatDate, hoyLima } from '@/lib/utils'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import { Pagina, Grupo, Fila, Vacio } from '@/components/ui/ios'
import AccionesVisita from '@/components/miembros/AccionesVisita'

// Visitas a la casa de los hermanos: programadas (se crean desde "Faltaron") y realizadas.
export default async function VisitasPastoralesPage() {
  const supabase = await createClient()
  const hoy = hoyLima()
  const { data: visitas } = await supabase.from('visitas_pastorales')
    .select('id, fecha, estado, motivo, nota, persona:personas!visitas_pastorales_persona_id_fkey(id, nombre_completo, foto_url, telefono, direccion), responsable:personas!visitas_pastorales_responsable_id_fkey(nombre_completo)')
    .order('fecha', { ascending: true })

  type P = { id: string; nombre_completo: string; foto_url: string | null; telefono: string | null; direccion: string | null }
  const lista = (visitas ?? []).map((v) => ({ ...v, p: v.persona as unknown as P, r: (v.responsable as unknown as { nombre_completo: string } | null)?.nombre_completo }))
  const programadas = lista.filter((v) => v.estado === 'programada')
  const hechas = lista.filter((v) => v.estado !== 'programada').reverse().slice(0, 30)

  return (
    <Pagina ancho="estrecho" titulo="Visitas pastorales" subtitulo="Visitas a la casa de los hermanos" volver={{ href: '/miembros', texto: 'Seguimiento' }}>
      {!lista.length && <Vacio icono={<House size={44} />} titulo="No hay visitas programadas" texto="Prográmalas desde “Faltaron”, en la ausencia de cada hermano." />}

      {programadas.length > 0 && (
        <Grupo titulo="Programadas">
          {programadas.map((v, i) => (
            <Fila key={v.id} primero={i === 0} inicio={<Avatar nombre={v.p.nombre_completo} fotoUrl={v.p.foto_url} size="sm" />}
              titulo={v.p.nombre_completo}
              subtitulo={[formatDate(v.fecha), v.r ? `Va: ${v.r}` : 'Sin responsable', v.motivo].filter(Boolean).join(' · ')}
              detalle={v.fecha < hoy ? <Badge variant="error">Atrasada</Badge> : v.fecha === hoy ? <Badge variant="warning">Hoy</Badge> : undefined}>
              {(v.p.telefono || v.p.direccion) && (
                <span className="block text-[13px] mt-0.5" style={{ color: 'var(--muted)' }}>{[v.p.telefono, v.p.direccion].filter(Boolean).join(' · ')}</span>
              )}
              <AccionesVisita id={v.id} />
            </Fila>
          ))}
        </Grupo>
      )}

      {hechas.length > 0 && (
        <Grupo titulo="Realizadas y canceladas">
          {hechas.map((v, i) => (
            <Fila key={v.id} primero={i === 0} inicio={<Avatar nombre={v.p.nombre_completo} fotoUrl={v.p.foto_url} size="sm" />}
              titulo={v.p.nombre_completo}
              subtitulo={[formatDate(v.fecha), v.r && `Fue: ${v.r}`, v.nota].filter(Boolean).join(' · ')}
              detalle={<Badge variant={v.estado === 'realizada' ? 'success' : 'muted'}>{v.estado === 'realizada' ? 'Realizada' : 'Cancelada'}</Badge>} />
          ))}
        </Grupo>
      )}
    </Pagina>
  )
}
