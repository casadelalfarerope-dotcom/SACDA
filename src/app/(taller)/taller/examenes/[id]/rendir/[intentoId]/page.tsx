import { notFound, redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { personaActual } from '@/lib/academia/servidor'
import { notaTope } from '@/lib/academia/reglas'
import RendirExamen, { type PreguntaAlumno } from '@/components/academia/RendirExamen'

export default async function RendirPage({ params }: { params: Promise<{ id: string; intentoId: string }> }) {
  const { id, intentoId } = await params
  const yo = await personaActual()
  const admin = createServiceClient()
  const { data: intento } = await admin.from('examen_intentos')
    .select('id, examen_id, persona_id, estado, numero, tipo, factor').eq('id', intentoId).maybeSingle()
  if (!yo || !intento || intento.persona_id !== yo.personaId || intento.examen_id !== id) notFound()
  if (intento.estado !== 'en_curso') redirect(`/taller/examenes/${id}`)

  const [{ data: examen }, { data: preguntas }] = await Promise.all([
    admin.from('examenes').select('titulo').eq('id', id).single(),
    // Sin es_correcta: el alumno nunca recibe las respuestas.
    admin.from('examen_preguntas').select('id, tipo, enunciado, puntos, orden, examen_opciones(id, texto, orden)')
      .eq('examen_id', id).order('orden'),
  ])

  const lista: PreguntaAlumno[] = (preguntas ?? []).map((p) => ({
    id: p.id, tipo: p.tipo, enunciado: p.enunciado, puntos: Number(p.puntos),
    opciones: p.tipo === 'respuesta_corta' || p.tipo === 'parrafo' ? []
      : ((p.examen_opciones ?? []) as { id: string; texto: string; orden: number }[])
        .sort((a, b) => a.orden - b.orden).map(({ id: oid, texto }) => ({ id: oid, texto })),
  }))
  const tope = notaTope(Number(intento.factor))

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{examen?.titulo}</h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          {intento.tipo === 'recuperacion' ? 'Examen de recuperación' : `Intento ${intento.numero}`} · Nota máxima: {tope}/20
        </p>
      </div>
      <RendirExamen examenId={id} intentoId={intentoId} preguntas={lista} tope={tope} />
    </div>
  )
}
