import { createClient } from '@/lib/supabase/server'
import { Church, Plus } from 'lucide-react'
import { formatDateShort } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import { IconoModulo } from '@/components/ui/IconoApp'
import { Pagina, Grupo, Fila, BotonEnlace, Vacio } from '@/components/ui/ios'

const tipoLabel: Record<string, string> = {
  bautismo: 'Bautismo',
  dedicacion: 'Dedicación',
  boda: 'Boda',
}
const tipoVariant: Record<string, 'default' | 'success' | 'warning'> = {
  bautismo: 'default',
  dedicacion: 'warning',
  boda: 'success',
}

export default async function CeremoniasPage() {
  const supabase = await createClient()

  const { data: ceremonias } = await supabase
    .from('ceremonias')
    .select('*, ceremonia_personas(rol_en_ceremonia, nombre_externo, persona:personas(nombre_completo))')
    .order('fecha', { ascending: false })

  return (
    <Pagina titulo="Ceremonias" subtitulo={`${ceremonias?.length ?? 0} registros`} volver={{ href: '/miembros', texto: 'Seguimiento' }}
      acciones={<BotonEnlace href="/miembros/ceremonias/nueva" etiqueta="Registrar ceremonia"><Plus size={17} aria-hidden="true" /><span className="hidden sm:inline">Nueva</span></BotonEnlace>}>
      {!ceremonias?.length ? (
        <Vacio icono={<Church size={44} />} titulo="Sin ceremonias registradas" texto="Registra bautismos, dedicaciones o bodas con el botón +." />
      ) : (
        <Grupo>
          {ceremonias.map((c, i) => {
            const nombres = (c.ceremonia_personas ?? [])
              .map((cp: { nombre_externo?: string | null; persona?: { nombre_completo: string } | null }) => cp.persona?.nombre_completo ?? cp.nombre_externo ?? '')
              .filter(Boolean).join(', ')
            return (
              <Fila key={c.id} primero={i === 0}
                inicio={<IconoModulo icon={Church} color={c.tipo === 'boda' ? '#ff2d55' : c.tipo === 'dedicacion' ? '#ff9500' : '#a35d2d'} />}
                titulo={nombres || (tipoLabel[c.tipo] ?? c.tipo)}
                subtitulo={[formatDateShort(c.fecha), c.officiante && `Oficia: ${c.officiante}`].filter(Boolean).join(' · ')}
                detalle={<Badge label={tipoLabel[c.tipo] ?? c.tipo} variant={tipoVariant[c.tipo] ?? 'default'} />} />
            )
          })}
        </Grupo>
      )}
    </Pagina>
  )
}
