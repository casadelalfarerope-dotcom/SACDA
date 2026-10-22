import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { cerrarIntentosVencidos, estaInscrito, personaActual } from '@/lib/academia/servidor'
import { disponibilidadExamen, mejorNota, notaTope, type IntentoResumen } from '@/lib/academia/reglas'
import ReglasExamen from '@/components/academia/ReglasExamen'
import IniciarExamen from '@/components/academia/IniciarExamen'
import Badge from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'

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
    <div className="space-y-5">
      <div>
        <Link href={`/taller/cursos/${examen.curso_id}`} className="text-sm hover:underline" style={{ color: 'var(--muted)' }}>{curso.nombre}</Link>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{examen.titulo}</h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          {preguntas} preguntas{examen.fecha_limite ? ` · Plazo: ${formatDate(examen.fecha_limite, { time: true })}` : ''}
        </p>
        {examen.descripcion && <p className="text-sm mt-2 whitespace-pre-line" style={{ color: 'var(--foreground)' }}>{examen.descripcion}</p>}
      </div>

      {mejor != null && (
        <div className="p-4 rounded-2xl border text-center" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>Tu nota (mejor intento)</p>
          <p className="text-4xl font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>{mejor}<span className="text-lg" style={{ color: 'var(--muted)' }}>/20</span></p>
        </div>
      )}

      <ReglasExamen conRecuperacion={examen.permite_recuperacion} />

      {lista.length > 0 && (
        <section aria-labelledby="int-t" className="p-4 rounded-2xl border space-y-2" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h2 id="int-t" className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Mis intentos</h2>
          <ul className="space-y-1.5">
            {lista.map((i) => (
              <li key={i.id} className="flex items-center justify-between text-sm" style={{ color: 'var(--foreground)' }}>
                <span>{i.tipo === 'recuperacion' ? 'Recuperación' : `Intento ${i.numero}`}</span>
                {i.estado === 'calificado' ? <Badge variant="default">{i.nota}/20</Badge>
                  : i.estado === 'en_revision' ? <Badge variant="warning">En revisión</Badge>
                  : <Badge variant="muted">Sin enviar</Badge>}
              </li>
            ))}
          </ul>
        </section>
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
        <p className="text-sm p-4 rounded-xl text-center" style={{ background: 'var(--surface-secondary)', color: 'var(--muted)' }}>{disp.motivo}</p>
      )}
    </div>
  )
}
