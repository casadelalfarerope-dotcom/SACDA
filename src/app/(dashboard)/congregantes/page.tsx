import { createClient } from '@/lib/supabase/server'
import { Plus, Search, Users } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import { Pagina, Grupo, Fila, SegmentadoEnlaces, BotonEnlace, Vacio } from '@/components/ui/ios'
import { calcularEdad } from '@/lib/utils'
import type { EstadoPersona } from '@/types/database'

const ESTADOS = [
  { valor: '', texto: 'Todos' },
  { valor: 'activo', texto: 'Activos' },
  { valor: 'visita', texto: 'Visitas' },
  { valor: 'inactivo', texto: 'Inactivos' },
]

export default async function CongregantesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string; ministerio?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase.from('personas').select('*').order('nombre_completo')
  if (params.q) {
    const q = params.q.replace(/[%,()]/g, ' ')
    query = query.or(`nombre_completo.ilike.%${q}%,dni.ilike.%${q}%`)
  }
  if (params.estado) query = query.eq('estado', params.estado as EstadoPersona)
  // Filtro por ministerio (el valor es el id del ministerio): sus integrantes activos.
  const { data: grupos } = await supabase.from('grupos').select('id, nombre').eq('activo', true).order('nombre')
  if (params.ministerio) {
    const { data: miembros } = await supabase.from('grupo_miembros').select('persona_id').eq('grupo_id', params.ministerio).eq('activo', true)
    query = query.in('id', (miembros ?? []).map((m) => m.persona_id as string).concat('00000000-0000-0000-0000-000000000000'))
  }
  const { data: personas } = await query.limit(300)

  const enlace = (cambios: Record<string, string>) => {
    const sp = new URLSearchParams(Object.entries({ q: params.q ?? '', estado: params.estado ?? '', ministerio: params.ministerio ?? '', ...cambios }).filter(([, v]) => v))
    return `/congregantes${sp.size ? `?${sp}` : ''}`
  }

  const porLetra = new Map<string, NonNullable<typeof personas>>()
  for (const p of personas ?? []) {
    const letra = p.nombre_completo.normalize('NFD').charAt(0).toUpperCase()
    porLetra.set(letra, [...(porLetra.get(letra) ?? []), p])
  }

  return (
    <Pagina
      titulo="Congregantes"
      subtitulo={`${personas?.length ?? 0} ${personas?.length === 1 ? 'persona' : 'personas'}`}
      acciones={<BotonEnlace href="/congregantes/nuevo" etiqueta="Nuevo congregante"><Plus size={17} aria-hidden="true" /><span className="hidden sm:inline">Nuevo</span></BotonEnlace>}>

      <div className="space-y-3">
        <form role="search" className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={17} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--muted)' }} />
            <input name="q" type="search" aria-label="Buscar por nombre o DNI" defaultValue={params.q} placeholder="Buscar por nombre o DNI"
              className="w-full h-10 pl-9 pr-3 rounded-[10px] text-[15px] outline-none border border-transparent"
              style={{ background: 'var(--fill)', color: 'var(--foreground)' }} />
          </div>
          <select name="ministerio" aria-label="Filtrar por ministerio" defaultValue={params.ministerio ?? ''}
            className="h-10 px-3 rounded-[10px] text-[15px] outline-none border border-transparent cursor-pointer"
            style={{ background: 'var(--fill)', color: 'var(--foreground)' }}>
            <option value="">Todos los ministerios</option>
            {(grupos ?? []).map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
          </select>
          {params.estado && <input type="hidden" name="estado" value={params.estado} />}
          <button type="submit" className="h-10 px-5 rounded-full text-[14px] font-semibold"
            style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)' }}>
            Buscar
          </button>
        </form>
        <SegmentadoEnlaces etiqueta="Filtrar por estado" actual={params.estado ?? ''}
          opciones={ESTADOS.map((e) => ({ ...e, href: enlace({ estado: e.valor }) }))} />
      </div>

      {!personas?.length ? (
        <Vacio icono={<Users size={44} />} titulo="Sin resultados" texto="Ajusta la búsqueda o registra un nuevo congregante." />
      ) : (
        <div className="space-y-5">
          {[...porLetra.entries()].map(([letra, grupo]) => (
            <Grupo key={letra} titulo={letra}>
              {grupo.map((p, i) => (
                <Fila key={p.id} href={`/congregantes/${p.id}`} primero={i === 0}
                  inicio={<Avatar nombre={p.nombre_completo} fotoUrl={p.foto_url} size="md" />}
                  titulo={p.nombre_completo}
                  subtitulo={[p.ministerio, p.fecha_nacimiento ? `${calcularEdad(p.fecha_nacimiento)} años` : null, p.dni ? `DNI ${p.dni}` : null].filter(Boolean).join(' · ')}
                  detalle={p.estado !== 'activo'
                    ? <Badge variant={p.estado === 'visita' ? 'warning' : 'muted'}>{p.estado === 'visita' ? 'Visita' : 'Inactivo'}</Badge>
                    : undefined} />
              ))}
            </Grupo>
          ))}
        </div>
      )}
    </Pagina>
  )
}
