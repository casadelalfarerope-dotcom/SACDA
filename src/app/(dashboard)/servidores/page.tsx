import { createClient } from '@/lib/supabase/server'
import { Plus, Mic2 } from 'lucide-react'
import { formatDate, hoyLima } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import { IconoModulo } from '@/components/ui/IconoApp'
import { Pagina, Grupo, Fila, BotonEnlace, Vacio } from '@/components/ui/ios'

const estadoLabel: Record<string, string> = { borrador: 'Borrador', publicado: 'Publicado' }
const estadoColor: Record<string, 'warning' | 'success'> = { borrador: 'warning', publicado: 'success' }

export default async function ServidoresPage() {
  const supabase = await createClient()
  const { data: programas } = await supabase
    .from('programas')
    .select('*, programa_asignaciones(id)')
    .order('fecha', { ascending: false })
    .limit(50)

  const hoy = hoyLima()
  const proximos = (programas ?? []).filter((p) => p.fecha >= hoy).reverse()
  const pasados = (programas ?? []).filter((p) => p.fecha < hoy)
  const servidores = (p: { programa_asignaciones: unknown }) => (p.programa_asignaciones as unknown[]).length

  return (
    <Pagina titulo="Servidores" subtitulo="Programación de cada culto"
      acciones={<>
        <BotonEnlace href="/servidores/roles" variante="tintado">Roles</BotonEnlace>
        <BotonEnlace href="/servidores/nuevo" etiqueta="Nuevo programa"><Plus size={17} aria-hidden="true" /><span className="hidden sm:inline">Nuevo</span></BotonEnlace>
      </>}>

      {!programas?.length && (
        <Vacio icono={<Mic2 size={44} />} titulo="Sin programas aún" texto="Crea el primer programa de servidores con el botón +." />
      )}

      {proximos.length > 0 && (
        <Grupo titulo="Próximos">
          {proximos.map((p, i) => (
            <Fila key={p.id} href={`/servidores/${p.id}`} primero={i === 0}
              inicio={<IconoModulo icon={Mic2} color="#ff2d55" tamano={36} />}
              titulo={p.titulo}
              subtitulo={`${formatDate(p.fecha)} · ${servidores(p)} ${servidores(p) === 1 ? 'servidor' : 'servidores'}`}
              detalle={<Badge variant={estadoColor[p.estado] ?? 'default'}>{estadoLabel[p.estado] ?? p.estado}</Badge>} />
          ))}
        </Grupo>
      )}

      {pasados.length > 0 && (
        <Grupo titulo="Anteriores">
          {pasados.slice(0, 10).map((p, i) => (
            <Fila key={p.id} href={`/servidores/${p.id}`} primero={i === 0}
              titulo={<span style={{ color: 'var(--muted)' }}>{p.titulo}</span>}
              subtitulo={`${formatDate(p.fecha)} · ${servidores(p)} ${servidores(p) === 1 ? 'servidor' : 'servidores'}`} />
          ))}
        </Grupo>
      )}
    </Pagina>
  )
}
