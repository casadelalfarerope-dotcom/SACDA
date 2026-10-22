import Link from 'next/link'
import { notFound } from 'next/navigation'
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
  if (intento.estado !== 'en_curso') {
    const { data: hecho } = await admin.from('examen_intentos').select('nota, factor').eq('id', intentoId).single()
    return (
      <div role="status" className="p-6 rounded-2xl border text-center space-y-3" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        {intento.estado === 'calificado' ? (
          <>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Tu nota en este intento</p>
            <p className="text-5xl font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>
              {hecho?.nota}<span className="text-xl" style={{ color: 'var(--muted)' }}>/20</span>
            </p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>Nota máxima posible en este intento: {notaTope(Number(hecho?.factor ?? 1))}/20</p>
          </>
        ) : (
          <p className="text-sm" style={{ color: 'var(--foreground)' }}>
            Enviado. Tu examen tiene preguntas abiertas: un líder las calificará y te avisaremos tu nota.
          </p>
        )}
        <Link href={`/taller/examenes/${id}`} className="inline-block text-sm font-medium underline" style={{ color: 'var(--accent)' }}>Volver al examen</Link>
      </div>
    )
  }

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
