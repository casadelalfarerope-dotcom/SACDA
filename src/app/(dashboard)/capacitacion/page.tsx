import { createClient } from '@/lib/supabase/server'
import { Plus, PlayCircle, BookOpen, GraduationCap } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import { IconoModulo } from '@/components/ui/IconoApp'
import { Pagina, Grupo, Fila, BotonEnlace, Vacio } from '@/components/ui/ios'

const destinoLabel: Record<string, string> = {
  pantalla_principal: 'Pantalla principal',
  redes_sociales: 'Redes sociales',
  general: 'General',
}

export default async function CapacitacionPage() {
  const supabase = await createClient()
  const { data: tutoriales } = await supabase
    .from('tutoriales')
    .select('*, roles_servicio(nombre, color), tutorial_progreso(visto)')
    .order('created_at', { ascending: false })

  const publicados = tutoriales?.filter((t) => t.publicado) ?? []
  const borradores = tutoriales?.filter((t) => !t.publicado) ?? []

  return (
    <Pagina titulo="Capacitación" subtitulo="Tutoriales por área de servicio"
      acciones={<BotonEnlace href="/capacitacion/nuevo" etiqueta="Nuevo tutorial"><Plus size={17} aria-hidden="true" /><span className="hidden sm:inline">Nuevo</span></BotonEnlace>}>

      {!tutoriales?.length && <Vacio icono={<GraduationCap size={44} />} titulo="Sin tutoriales aún" texto="Agrega el primer material de capacitación con el botón +." />}

      {publicados.length > 0 && (
        <Grupo titulo="Publicados">
          {publicados.map((t, i) => {
            const area = t.roles_servicio as { nombre: string; color: string } | null
            const vistos = (t.tutorial_progreso as { visto: boolean }[]).filter((p) => p.visto).length
            return (
              <Fila key={t.id} href={`/capacitacion/${t.id}`} primero={i === 0}
                inicio={<IconoModulo icon={PlayCircle} color={area?.color ?? '#32ade6'} tamano={36} />}
                titulo={t.titulo}
                subtitulo={[area?.nombre, destinoLabel[t.tipo_destino] ?? t.tipo_destino, vistos ? `${vistos} lo vieron` : null].filter(Boolean).join(' · ')} />
            )
          })}
        </Grupo>
      )}

      {borradores.length > 0 && (
        <Grupo titulo="Borradores">
          {borradores.map((t, i) => (
            <Fila key={t.id} href={`/capacitacion/${t.id}`} primero={i === 0}
              inicio={<IconoModulo icon={BookOpen} color="#8e8e93" tamano={36} />}
              titulo={t.titulo} detalle={<Badge variant="warning">Borrador</Badge>} />
          ))}
        </Grupo>
      )}
    </Pagina>
  )
}
