import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ExternalLink, Eye, Pencil } from 'lucide-react'
import { IconoModulo } from '@/components/ui/IconoApp'
import { Pagina, Grupo, Fila, BotonEnlace, Vacio } from '@/components/ui/ios'
import PublicarTutorialBtn from '@/components/servidores/PublicarTutorialBtn'
import MarcarVistoBtn from '@/components/servidores/MarcarVistoBtn'

const destinoLabel: Record<string, string> = {
  pantalla_principal: 'Pantalla principal',
  redes_sociales: 'Redes sociales',
  general: 'General',
}

function getEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname === 'www.youtube.com' || u.hostname === 'youtu.be') {
      const vid = u.searchParams.get('v') ?? u.pathname.split('/').pop()
      return `https://www.youtube.com/embed/${vid}`
    }
    if (u.hostname === 'drive.google.com') {
      const m = u.pathname.match(/\/d\/([^/]+)/)
      if (m) return `https://drive.google.com/file/d/${m[1]}/preview`
    }
  } catch { /* */ }
  return null
}

export default async function TutorialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: cuenta } = user ? await supabase.from('cuentas').select('persona_id').eq('id', user.id).single() : { data: null }

  const { data: tut } = await supabase
    .from('tutoriales')
    .select('*, roles_servicio(nombre, color), tutorial_progreso(persona_id, visto)')
    .eq('id', id)
    .single()

  if (!tut) notFound()

  const mismoProgreso = (tut.tutorial_progreso as any[]).find((p) => p.persona_id === cuenta?.persona_id)
  const yaVisto = mismoProgreso?.visto === true
  const totalVistos = (tut.tutorial_progreso as any[]).filter((p) => p.visto).length

  const embedUrl = tut.url_contenido ? getEmbedUrl(tut.url_contenido) : null

  const area = tut.roles_servicio as { nombre: string; color: string } | null
  return (
    <Pagina titulo={tut.titulo} subtitulo={[area?.nombre, destinoLabel[tut.tipo_destino] ?? tut.tipo_destino].filter(Boolean).join(' · ')}
      volver={{ href: '/capacitacion', texto: 'Capacitación' }}
      acciones={<>
        <BotonEnlace href={`/capacitacion/${id}/editar`} variante="tintado"><Pencil size={14} aria-hidden="true" /> Editar</BotonEnlace>
        <PublicarTutorialBtn tutorialId={tut.id} publicado={tut.publicado} />
      </>}>

      {tut.descripcion && (
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--foreground)' }}>{tut.descripcion}</p>
      )}

      {embedUrl ? (
        <div className="rounded-2xl overflow-hidden bg-black" style={{ boxShadow: 'var(--shadow-card)' }}>
          <iframe src={embedUrl} className="w-full aspect-video" allowFullScreen title={tut.titulo} />
        </div>
      ) : tut.url_contenido ? (
        <Grupo>
          <Fila primero inicio={<IconoModulo icon={ExternalLink} color="#007aff" />}>
            <a href={tut.url_contenido} target="_blank" rel="noopener noreferrer" className="block text-[15px] font-medium" style={{ color: 'var(--accent)' }}>
              Abrir contenido
            </a>
          </Fila>
        </Grupo>
      ) : (
        <Vacio titulo="Sin enlace de contenido" texto="Edita el tutorial para agregar un video o documento." />
      )}

      <Grupo>
        <Fila primero inicio={<IconoModulo icon={Eye} color="#34c759" />}
          titulo={`${totalVistos} ${totalVistos === 1 ? 'persona lo vio' : 'personas lo vieron'}`}
          detalle={yaVisto
            ? <span className="font-medium" style={{ color: 'var(--success)' }}>Ya lo viste</span>
            : cuenta?.persona_id ? <MarcarVistoBtn tutorialId={tut.id} personaId={cuenta.persona_id} /> : undefined} />
      </Grupo>
    </Pagina>
  )
}
