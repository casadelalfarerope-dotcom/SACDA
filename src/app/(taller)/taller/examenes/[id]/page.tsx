import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { cerrarIntentosVencidos, estaInscrito, personaActual } from '@/lib/academia/servidor'
import { disponibilidadExamen, mejorNota, notaTope, type IntentoResumen } from '@/lib/academia/reglas'
import ReglasExamen from '@/components/academia/ReglasExamen'
import IniciarExamen from '@/components/academia/IniciarExamen'
import Badge from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import { Pagina, Grupo, Fila } from '@/components/ui/ios'

export default async function TallerExamenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const yo = await personaActual()
  const admin = createServiceClient()
  const { data: examen } = await admin.from('examenes')
    .select('id, titulo, descripcion, curso_id, estado, fecha_limite, permite_recuperacion, curso:cursos(nombre), examen_preguntas(puntos)')
    .eq('id', id).maybeSingle()
  if (!yo || !examen || examen.estado === 'borrador' || !(await estaInscrito(admin, examen.curso_id, yo.personaId))) notFound()

  await cerrarIntentosVencidos(admin, id, yo.personaId)
  const [{ data: intentos }, { data: hab }] = await Promise.all([
    admin.from('examen_intentos').select('id, numero, tipo, estado, nota, enviado_en').eq('examen_id', id).eq('persona_id', yo.personaId).order('iniciado_en'),
    admin.from('examen_habilitaciones').select('fecha_limite').eq('examen_id', id).eq('persona_id', yo.personaId).maybeSingle(),
  ])
  const lista = (intentos ?? []) as (IntentoResumen & { id: string; enviado_en: string | null })[]
  const disp = disponibilidadExamen({
    estadoExamen: examen.estado, fechaLimite: examen.fecha_limite, permiteRecuperacion: examen.permite_recuperacion,
    habilitacionHasta: hab?.fecha_limite ?? null, intentos: lista,
  })
  const mejor = mejorNota(lista)
  const preguntas = (examen.examen_preguntas as { puntos: number }[]).length
  const curso = examen.curso as unknown as { nombre: string }

  return (
    <Pagina ancho="estrecho" titulo={examen.titulo}
      subtitulo={`${preguntas} preguntas${examen.fecha_limite ? ` · Plazo: ${formatDate(examen.fecha_limite, { time: true })}` : ''}`}
      volver={{ href: `/taller/cursos/${examen.curso_id}`, texto: curso.nombre }}>
      {examen.descripcion && <p className="text-[15px] whitespace-pre-line" style={{ color: 'var(--foreground)' }}>{examen.descripcion}</p>}

      {mejor != null && (
        <section aria-label="Tu nota" className="rounded-2xl border p-5 text-center" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <p className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Tu nota · mejor intento</p>
          <p className="text-[48px] leading-none font-bold tabular-nums tracking-tight mt-2" style={{ color: 'var(--foreground)' }}>
            {mejor}<span className="text-[22px]" style={{ color: 'var(--muted)' }}>/20</span>
          </p>
        </section>
      )}

      <ReglasExamen conRecuperacion={examen.permite_recuperacion} />

      {lista.length > 0 && (
        <Grupo titulo="Mis intentos">
          {lista.map((i, k) => (
            <Fila key={i.id} primero={k === 0} titulo={i.tipo === 'recuperacion' ? 'Recuperación' : `Intento ${i.numero}`}
              detalle={i.estado === 'calificado' ? <span className="font-semibold tabular-nums" style={{ color: 'var(--foreground)' }}>{i.nota}/20</span>
                : i.estado === 'en_revision' ? <Badge variant="warning">En revisión</Badge>
                : <Badge variant="muted">Sin enviar</Badge>} />
          ))}
        </Grupo>
      )}

      {disp.tipo === 'continuar' && <IniciarExamen examenId={id} texto="Continuar mi intento" />}
      {disp.tipo === 'nuevo' && (
        <IniciarExamen examenId={id}
          texto={disp.intento === 'recuperacion'
            ? `Rendir examen de recuperación (máx. ${notaTope(disp.factor)}/20)`
            : `Empezar intento ${disp.numero} (máx. ${notaTope(disp.factor)}/20)`}
          confirmar={`Vas a empezar ${disp.intento === 'recuperacion' ? 'tu examen de recuperación' : `tu intento ${disp.numero}`}. Tu nota máxima será ${notaTope(disp.factor)}/20 y el intento contará aunque no lo envíes. ¿Continuar?`} />
      )}
      {disp.tipo === 'bloqueado' && (
        <p className="text-[15px] p-4 rounded-2xl text-center" style={{ background: 'var(--fill)', color: 'var(--muted)' }}>{disp.motivo}</p>
      )}
    </Pagina>
  )
}
