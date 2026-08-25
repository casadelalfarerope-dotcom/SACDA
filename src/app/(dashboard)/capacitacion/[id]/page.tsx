import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Eye } from 'lucide-react'
import Badge from '@/components/ui/Badge'
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

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/capacitacion"
          className="p-2 rounded-xl hover:opacity-70 transition-opacity"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <ArrowLeft size={18} style={{ color: 'var(--foreground)' }} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>{tut.titulo}</h1>
          {tut.roles_servicio && (
            <span className="text-xs px-2 py-0.5 rounded-full text-white"
              style={{ background: (tut.roles_servicio as any).color }}>
              {(tut.roles_servicio as any).nombre}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="default">{destinoLabel[tut.tipo_destino] ?? tut.tipo_destino}</Badge>
          <PublicarTutorialBtn tutorialId={tut.id} publicado={tut.publicado} />
        </div>
      </div>

      {tut.descripcion && (
        <p className="mb-6 text-sm leading-relaxed" style={{ color: 'var(--foreground)' }}>{tut.descripcion}</p>
      )}

      {embedUrl ? (
        <div className="mb-6 rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
          <iframe src={embedUrl} className="w-full aspect-video" allowFullScreen title={tut.titulo} />
        </div>
      ) : tut.url_contenido ? (
        <a href={tut.url_contenido} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 p-4 rounded-2xl border mb-6 transition-opacity hover:opacity-80"
          style={{ background: 'var(--surface)', borderColor: 'var(--accent)', color: 'var(--accent)' }}>
          <ExternalLink size={18} />
          <span className="text-sm font-medium">Abrir contenido</span>
        </a>
      ) : (
        <div className="p-4 rounded-2xl border mb-6 text-center" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Sin enlace de contenido</p>
        </div>
      )}

      <div className="flex items-center justify-between p-4 rounded-2xl border"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <Eye size={16} style={{ color: 'var(--muted)' }} />
          <span className="text-sm" style={{ color: 'var(--muted)' }}>
            {totalVistos} {totalVistos === 1 ? 'persona lo vio' : 'personas lo vieron'}
          </span>
        </div>
        {cuenta?.persona_id && !yaVisto && (
          <MarcarVistoBtn tutorialId={tut.id} personaId={cuenta.persona_id} />
        )}
        {yaVisto && (
          <span className="text-sm font-medium" style={{ color: '#16a34a' }}>Ya lo viste</span>
        )}
      </div>
    </div>
  )
}
