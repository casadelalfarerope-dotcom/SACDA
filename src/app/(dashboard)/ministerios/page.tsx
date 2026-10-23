import { createClient } from '@/lib/supabase/server'
import { Plus, Users } from 'lucide-react'
import { Pagina, Grupo, Fila, BotonEnlace, Vacio } from '@/components/ui/ios'

export default async function MinisteriosPage() {
  const supabase = await createClient()

  // Grupos raíz (sin padre)
  const { data: grupos } = await supabase
    .from('grupos')
    .select(`
      *,
      encargado:personas(nombre_completo),
      subgrupos:grupos!grupo_padre_id(id, nombre, activo),
      miembros:grupo_miembros(id)
    `)
    .is('grupo_padre_id', null)
    .eq('activo', true)
    .order('nombre')

  return (
    <Pagina titulo="Ministerios" subtitulo={`${grupos?.length ?? 0} ministerios activos`}
      acciones={<BotonEnlace href="/ministerios/nuevo" etiqueta="Nuevo ministerio o grupo"><Plus size={17} aria-hidden="true" /><span className="hidden sm:inline">Nuevo</span></BotonEnlace>}>
      {!grupos?.length ? (
        <Vacio icono={<Users size={44} />} titulo="Sin ministerios" texto="Crea el primer ministerio o grupo con el botón +." />
      ) : (
        <div className="space-y-5">
          {(['servicio', 'administrativo'] as const).map((tipo) => {
            const lista = (grupos ?? []).filter((g) => g.tipo === tipo)
            if (!lista.length) return null
            return (
              <Grupo key={tipo} titulo={tipo === 'servicio' ? 'De servicio' : 'Administrativos'}>
                {lista.map((g, i) => {
                  const encargado = Array.isArray(g.encargado) ? g.encargado[0] : g.encargado
                  const subgrupos = ((g.subgrupos ?? []) as { id: string; nombre: string; activo: boolean }[]).filter((s) => s.activo)
                  const total = (g.miembros ?? []).length
                  return (
                    <Fila key={g.id} href={`/ministerios/${g.id}`} primero={i === 0}
                      inicio={<span className="w-9 h-9 rounded-[10px] flex items-center justify-center text-white text-[15px] font-bold"
                        aria-hidden="true" style={{ background: tipo === 'servicio' ? '#5856d6' : '#636366' }}>{g.nombre.charAt(0)}</span>}
                      titulo={g.nombre}
                      subtitulo={[`${total} ${total === 1 ? 'miembro' : 'miembros'}`,
                        encargado && `Líder: ${(encargado as { nombre_completo: string }).nombre_completo.split(' ')[0]}`,
                        subgrupos.length ? `Subgrupos: ${subgrupos.map((s) => s.nombre).join(', ')}` : null].filter(Boolean).join(' · ')}
                      detalle={g.enlace_whatsapp ? <span className="text-[13px] font-medium" style={{ color: '#1f9d55' }}>WhatsApp</span> : undefined} />
                  )
                })}
              </Grupo>
            )
          })}
        </div>
      )}
    </Pagina>
  )
}
