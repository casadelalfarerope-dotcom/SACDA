import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight, FileText, Trash2, Video } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { agregarMaterial, crearSesion, editarTema, eliminarMaterial, eliminarSesion } from '@/app/actions/academia'
import FormAccion from '@/components/academia/FormAccion'
import AccionBoton from '@/components/academia/AccionBoton'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import { formatDate } from '@/lib/utils'

export default async function TemaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: tema } = await supabase.from('temas').select('*, curso:cursos(id, nombre)').eq('id', id).maybeSingle()
  if (!tema) notFound()
  const curso = tema.curso as unknown as { id: string; nombre: string }

  const [{ data: sesiones }, { data: materiales }] = await Promise.all([
    supabase.from('sesiones').select('*').eq('tema_id', id).order('fecha'),
    supabase.from('materiales').select('*').eq('tema_id', id).order('created_at'),
  ])

  const tarjeta = 'p-5 rounded-2xl border space-y-4'
  const estiloTarjeta = { background: 'var(--surface)', borderColor: 'var(--border)' }

  return (
    <div className="px-4 md:px-8 py-6 max-w-3xl mx-auto space-y-7">
      <div>
        <Link href={`/academia/cursos/${curso.id}`} className="volver">
          {curso.nombre}
        </Link>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Tema {tema.orden}: {tema.titulo}</h1>
      </div>

      <section aria-labelledby="sesiones-t" className={tarjeta} style={estiloTarjeta}>
        <h2 id="sesiones-t" className="font-semibold" style={{ color: 'var(--foreground)' }}>Clases (sesiones)</h2>
        <p className="text-xs" style={{ color: 'var(--muted)' }}>Un tema puede dictarse en uno o varios días. Abre cada clase para tomar asistencia.</p>
        {!sesiones?.length && <p className="text-sm" style={{ color: 'var(--muted)' }}>Aún no hay clases programadas.</p>}
        <ul className="space-y-2">
          {sesiones?.map((s) => (
            <li key={s.id} className="flex items-center gap-2">
              <Link href={`/academia/sesiones/${s.id}`} className="flex-1 flex items-center gap-3 p-3 rounded-xl border hover:opacity-80"
                style={{ borderColor: 'var(--border)' }}>
                <span className="flex-1 text-sm" style={{ color: 'var(--foreground)' }}>
                  {formatDate(s.fecha)}{s.hora_inicio ? ` · ${String(s.hora_inicio).slice(0, 5)}` : ''}
                </span>
                {s.grabacion_url && <Video size={15} aria-label="Tiene grabación" style={{ color: 'var(--accent)' }} />}
                <ChevronRight size={16} aria-hidden="true" style={{ color: 'var(--muted)' }} />
              </Link>
              <AccionBoton accion={eliminarSesion.bind(null, s.id, id)} variant="ghost" ariaLabel={`Eliminar clase del ${formatDate(s.fecha)}`}
                confirmar="¿Eliminar esta clase? También se borrará su asistencia y resúmenes.">
                <Trash2 size={15} aria-hidden="true" />
              </AccionBoton>
            </li>
          ))}
        </ul>
        <details>
          <summary className="text-sm font-medium cursor-pointer" style={{ color: 'var(--accent)' }}>+ Programar clase</summary>
          <div className="pt-3">
            <FormAccion accion={crearSesion.bind(null, id)} textoBoton="Programar clase" limpiar>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input name="fecha" type="date" label="Fecha *" required />
                <Input name="hora_inicio" type="time" label="Hora de inicio" />
                <Input name="hora_fin" type="time" label="Hora de fin" />
              </div>
              <Input name="enlace_reunion" type="url" label="Enlace de Zoom o Meet" placeholder="https://meet.google.com/…" />
              <Input name="grabacion_url" type="url" label="Enlace de la grabación"
                hint="YouTube (no listado) permite verificar que el alumno vio la clase completa. Con Drive solo se puede confiar en lo que declara el alumno."
                placeholder="https://youtu.be/…" />
            </FormAccion>
          </div>
        </details>
      </section>

      <section aria-labelledby="materiales-t" className={tarjeta} style={estiloTarjeta}>
        <h2 id="materiales-t" className="font-semibold" style={{ color: 'var(--foreground)' }}>Material del tema</h2>
        {!materiales?.length && <p className="text-sm" style={{ color: 'var(--muted)' }}>Sin material.</p>}
        <ul className="space-y-2">
          {materiales?.map((m) => (
            <li key={m.id} className="flex items-center gap-2">
              <a href={m.url} target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center gap-2 text-sm hover:underline" style={{ color: 'var(--accent)' }}>
                <FileText size={15} aria-hidden="true" /> {m.titulo}
              </a>
              <AccionBoton accion={eliminarMaterial.bind(null, m.id, id)} variant="ghost" ariaLabel={`Eliminar ${m.titulo}`}
                confirmar={`¿Eliminar "${m.titulo}"?`}>
                <Trash2 size={15} aria-hidden="true" />
              </AccionBoton>
            </li>
          ))}
        </ul>
        <details>
          <summary className="text-sm font-medium cursor-pointer" style={{ color: 'var(--accent)' }}>+ Agregar material</summary>
          <div className="pt-3">
            <FormAccion accion={agregarMaterial.bind(null, id)} textoBoton="Agregar" limpiar>
              <Input name="titulo" label="Título *" required placeholder="Ej. Diapositivas de la clase" />
              <Input name="url" type="url" label="Enlace *" required placeholder="https://drive.google.com/…" />
            </FormAccion>
          </div>
        </details>
      </section>

      <section aria-labelledby="datos-t" className={tarjeta} style={estiloTarjeta}>
        <h2 id="datos-t" className="font-semibold" style={{ color: 'var(--foreground)' }}>Datos del tema</h2>
        <FormAccion accion={editarTema.bind(null, id)} textoBoton="Guardar cambios">
          <Input name="titulo" label="Título *" defaultValue={tema.titulo} required />
          <Textarea name="resumen" label="Resumen de la clase" rows={5} defaultValue={tema.resumen ?? ''} />
        </FormAccion>
      </section>
    </div>
  )
}
