import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { cerrarIntentosVencidos } from '@/lib/academia/servidor'
import { mejorNota, notaTope, FACTOR_RECUPERACION, type IntentoResumen } from '@/lib/academia/reglas'
import {
  calificarRespuestaForm, cerrarExamen, configurarRecuperacion, habilitarRecuperacion, publicarExamen,
} from '@/app/actions/academia'
import ExamenEditor from '@/components/academia/ExamenEditor'
import AccionBoton from '@/components/academia/AccionBoton'
import FormAccion from '@/components/academia/FormAccion'
import Badge from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import ReglasExamen from '@/components/academia/ReglasExamen'

export default async function ExamenLiderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: examen } = await supabase.from('examenes').select('*, curso:cursos(id, nombre)').eq('id', id).maybeSingle()
  if (!examen) notFound()
  const curso = examen.curso as unknown as { id: string; nombre: string }

  if (examen.estado !== 'borrador') await cerrarIntentosVencidos(createServiceClient(), id)

  const [{ data: preguntas }, { data: temas }] = await Promise.all([
    supabase.from('examen_preguntas').select('id, tipo, enunciado, puntos, orden, examen_opciones(texto, es_correcta, orden)')
      .eq('examen_id', id).order('orden'),
    supabase.from('temas').select('id, orden, titulo').eq('curso_id', curso.id).order('orden'),
  ])

  const encabezado = (
    <div>
      <Link href={`/academia/cursos/${curso.id}`} className="text-sm hover:underline" style={{ color: 'var(--muted)' }}>{curso.nombre}</Link>
      <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{examen.titulo}</h1>
    </div>
  )

  if (examen.estado === 'borrador') {
    const inicial = {
      titulo: examen.titulo, descripcion: examen.descripcion ?? '', tema_id: examen.tema_id,
      preguntas: (preguntas ?? []).map((p) => ({
        tipo: p.tipo, enunciado: p.enunciado, puntos: Number(p.puntos),
        opciones: ((p.examen_opciones ?? []) as { texto: string; es_correcta: boolean; orden: number }[])
          .sort((a, b) => a.orden - b.orden).map(({ texto, es_correcta }) => ({ texto, es_correcta })),
      })),
    }
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
        {encabezado}
        <div className="p-4 rounded-2xl border flex flex-wrap items-center gap-3" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <Badge variant="muted">Borrador</Badge>
          <p className="flex-1 text-sm" style={{ color: 'var(--muted)' }}>
            Guarda tus preguntas y luego publícalo. Los alumnos tendrán 7 días desde la publicación.
          </p>
          <AccionBoton accion={publicarExamen.bind(null, id)} variant="primary"
            confirmar="¿Publicar el examen? Se notificará a los alumnos y ya no podrás cambiar las preguntas cuando alguien lo rinda.">
            Publicar
          </AccionBoton>
        </div>
        <ExamenEditor examenId={id} inicial={inicial}
          temas={(temas ?? []).map((t) => ({ id: t.id, label: `${t.orden}. ${t.titulo}` }))} />
      </div>
    )
  }

  const [{ data: inscritos }, { data: intentos }, { data: habs }] = await Promise.all([
    supabase.from('curso_inscripciones')
      .select('persona_id, persona:personas!curso_inscripciones_persona_id_fkey(nombre_completo)')
      .eq('curso_id', curso.id).eq('activo', true),
    supabase.from('examen_intentos').select('id, persona_id, numero, tipo, estado, nota').eq('examen_id', id).order('iniciado_en'),
    supabase.from('examen_habilitaciones').select('persona_id, fecha_limite').eq('examen_id', id),
  ])

  const enRevisionIds = (intentos ?? []).filter((i) => i.estado === 'en_revision').map((i) => i.id)
  const { data: porCalificar } = enRevisionIds.length
    ? await supabase.from('examen_respuestas')
      .select('id, intento_id, texto, pregunta:examen_preguntas(enunciado, puntos)')
      .in('intento_id', enRevisionIds).is('puntos', null)
    : { data: [] }

  const nombre = new Map((inscritos ?? []).map((i) => [i.persona_id, (i.persona as unknown as { nombre_completo: string }).nombre_completo]))
  const personaDeIntento = new Map((intentos ?? []).map((i) => [i.id, i.persona_id]))
  const vencido = examen.estado === 'cerrado' || (examen.fecha_limite && new Date(examen.fecha_limite) < new Date())
  const tarjeta = 'p-5 rounded-2xl border space-y-4'
  const estiloTarjeta = { background: 'var(--surface)', borderColor: 'var(--border)' }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
      {encabezado}

      <section className={tarjeta} style={estiloTarjeta} aria-label="Estado del examen">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={vencido ? 'default' : 'success'}>{vencido ? 'Cerrado' : 'Abierto'}</Badge>
          {examen.fecha_limite && (
            <span className="text-sm" style={{ color: 'var(--muted)' }}>Plazo: {formatDate(examen.fecha_limite, { time: true })}</span>
          )}
          {examen.estado === 'publicado' && !vencido && (
            <AccionBoton accion={cerrarExamen.bind(null, id)} confirmar="¿Cerrar el examen antes del plazo?">Cerrar ahora</AccionBoton>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
          <p className="flex-1 text-sm" style={{ color: 'var(--foreground)' }}>
            Exámenes de recuperación: <strong>{examen.permite_recuperacion ? 'activados' : 'desactivados'}</strong>
            <span className="block text-xs" style={{ color: 'var(--muted)' }}>
              Si los activas, puedes reabrir el examen a alumnos específicos: un intento, nota máxima {notaTope(FACTOR_RECUPERACION)}/20.
            </span>
          </p>
          <AccionBoton accion={configurarRecuperacion.bind(null, id, !examen.permite_recuperacion)}>
            {examen.permite_recuperacion ? 'Desactivar' : 'Activar'}
          </AccionBoton>
        </div>
      </section>

      {!!porCalificar?.length && (
        <section className={tarjeta} style={estiloTarjeta} aria-labelledby="calif-t">
          <h2 id="calif-t" className="font-semibold" style={{ color: 'var(--foreground)' }}>Respuestas por calificar ({porCalificar.length})</h2>
          {porCalificar.map((r) => {
            const preg = r.pregunta as unknown as { enunciado: string; puntos: number }
            return (
              <div key={r.id} className="p-4 rounded-xl border space-y-2" style={{ borderColor: 'var(--border)' }}>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>{nombre.get(personaDeIntento.get(r.intento_id)!) ?? 'Alumno'}</p>
                <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{preg.enunciado}</p>
                <p className="text-sm whitespace-pre-line p-3 rounded-lg" style={{ background: 'var(--surface-secondary)', color: 'var(--foreground)' }}>{r.texto}</p>
                <FormAccion accion={calificarRespuestaForm.bind(null, r.id)} textoBoton="Calificar" className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1">
                    <label htmlFor={`pts-${r.id}`} className="block text-xs" style={{ color: 'var(--muted)' }}>Puntos (máx. {Number(preg.puntos)})</label>
                    <input id={`pts-${r.id}`} name="puntos" type="number" min={0} max={Number(preg.puntos)} step={0.5} required
                      className="w-24 px-3 py-2 rounded-xl text-sm border border-[color:var(--border)]" style={{ background: 'var(--surface)', color: 'var(--foreground)' }} />
                  </div>
                </FormAccion>
              </div>
            )
          })}
        </section>
      )}

      <section className={tarjeta} style={estiloTarjeta} aria-labelledby="res-t">
        <h2 id="res-t" className="font-semibold" style={{ color: 'var(--foreground)' }}>Resultados</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs" style={{ color: 'var(--muted)' }}>
                <th scope="col" className="px-2 py-2 font-medium">Alumno</th>
                <th scope="col" className="px-2 py-2 font-medium">Intentos</th>
                <th scope="col" className="px-2 py-2 font-medium text-right">Nota</th>
                {examen.permite_recuperacion && <th scope="col" className="px-2 py-2 font-medium"><span className="sr-only">Recuperación</span></th>}
              </tr>
            </thead>
            <tbody>
              {(inscritos ?? []).map((ins) => {
                const propios = (intentos ?? []).filter((i) => i.persona_id === ins.persona_id)
                const mejor = mejorNota(propios as IntentoResumen[])
                const hab = habs?.find((h) => h.persona_id === ins.persona_id)
                const yaRecupero = propios.some((i) => i.tipo === 'recuperacion')
                const puedeHabilitar = examen.permite_recuperacion && vencido && !yaRecupero && (mejor ?? 0) < notaTope(FACTOR_RECUPERACION)
                return (
                  <tr key={ins.persona_id} className="border-t align-top" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                    <td className="px-2 py-2">{nombre.get(ins.persona_id)}</td>
                    <td className="px-2 py-2 text-xs" style={{ color: 'var(--muted)' }}>
                      {propios.length === 0 ? 'No rindió' : propios.map((i) => (
                        <span key={i.id} className="block">
                          {i.tipo === 'recuperacion' ? 'Recuperación' : `Intento ${i.numero}`}:{' '}
                          {i.estado === 'calificado' ? `${i.nota}/20` : i.estado === 'en_revision' ? 'por calificar' : 'en curso'}
                        </span>
                      ))}
                    </td>
                    <td className="px-2 py-2 text-right font-semibold tabular-nums">{mejor ?? '—'}</td>
                    {examen.permite_recuperacion && (
                      <td className="px-2 py-2 text-right">
                        {hab && !yaRecupero ? (
                          <span className="text-xs" style={{ color: 'var(--muted)' }}>Habilitado hasta {formatDate(hab.fecha_limite)}</span>
                        ) : puedeHabilitar ? (
                          <AccionBoton accion={habilitarRecuperacion.bind(null, id, ins.persona_id, 7)}
                            confirmar={`¿Habilitar la recuperación para ${nombre.get(ins.persona_id)} por 7 días?`}>
                            Habilitar
                          </AccionBoton>
                        ) : null}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className={tarjeta} style={estiloTarjeta} aria-labelledby="preg-t">
        <h2 id="preg-t" className="font-semibold" style={{ color: 'var(--foreground)' }}>Preguntas</h2>
        <ReglasExamen />
        <ol className="space-y-3 list-decimal pl-5">
          {preguntas?.map((p) => (
            <li key={p.id} className="text-sm" style={{ color: 'var(--foreground)' }}>
              {p.enunciado} <span className="text-xs" style={{ color: 'var(--muted)' }}>({Number(p.puntos)} pts)</span>
              <ul className="mt-1 space-y-0.5">
                {((p.examen_opciones ?? []) as { texto: string; es_correcta: boolean; orden: number }[])
                  .sort((a, b) => a.orden - b.orden).map((o, j) => (
                    <li key={j} className="text-xs" style={{ color: o.es_correcta ? 'var(--success)' : 'var(--muted)' }}>
                      {o.es_correcta ? '✓ ' : '· '}{o.texto}
                    </li>
                  ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
