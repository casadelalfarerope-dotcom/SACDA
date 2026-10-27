import { School, Eye, Video } from 'lucide-react'
import { formatDate, hoyLima } from '@/lib/utils'
import { createClient } from '@/lib/supabase/server'
import { crearCurso } from '@/app/actions/academia'
import FormAccion from '@/components/academia/FormAccion'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'
import Badge from '@/components/ui/Badge'
import { IconoModulo } from '@/components/ui/IconoApp'
import { Pagina, Grupo, Fila, Tarjeta, Vacio, BotonEnlace } from '@/components/ui/ios'
import BuscadorPersona from '@/components/ui/BuscadorPersona'

const ESTADO: Record<string, { label: string; variant: 'muted' | 'success' | 'default' }> = {
  borrador: { label: 'Borrador', variant: 'muted' },
  activo: { label: 'Activo', variant: 'success' },
  finalizado: { label: 'Finalizado', variant: 'default' },
}

export default async function AcademiaPage() {
  const supabase = await createClient()
  const hoy = hoyLima()
  const [{ data: cursos }, { data: personas }, { data: clases }] = await Promise.all([
    supabase.from('cursos')
      .select('id, nombre, estado, fecha_inicio, profesor:personas(nombre_completo), curso_inscripciones(activo), temas(id)')
      .order('created_at', { ascending: false }),
    supabase.from('personas').select('id, nombre_completo').eq('estado', 'activo').order('nombre_completo'),
    // Clases de la última semana y las próximas, para pasar lista sin buscar el curso y el tema.
    supabase.from('sesiones').select('id, fecha, hora_inicio, tema:temas(titulo, curso:cursos(id, nombre, estado, curso_inscripciones(activo)))')
      .gte('fecha', new Date(Date.parse(hoy + 'T12:00:00Z') - 7 * 864e5).toISOString().slice(0, 10))
      .order('fecha').order('hora_inicio').limit(8),
  ])
  const { data: marcadas } = clases?.length
    ? await supabase.from('asistencias').select('sesion_id').in('sesion_id', clases.map((c) => c.id))
    : { data: [] as { sesion_id: string }[] }
  type Clase = { id: string; fecha: string; hora_inicio: string | null; tema: { titulo: string; curso: { id: string; nombre: string; estado: string; curso_inscripciones: { activo: boolean }[] } } | null }
  const marcadasPor = new Map<string, number>()
  for (const m of marcadas ?? []) marcadasPor.set(m.sesion_id, (marcadasPor.get(m.sesion_id) ?? 0) + 1)
  const listaClases = ((clases ?? []) as unknown as Clase[]).filter((c) => c.tema && c.tema.curso.estado !== 'borrador')

  return (
    <Pagina titulo="Academia" subtitulo="El Taller del Alfarero"
      acciones={<BotonEnlace href="/taller" variante="tintado"><Eye size={16} /> Ver como estudiante</BotonEnlace>}>
      {listaClases.length > 0 && (
        <Grupo titulo="Clases recientes y próximas" pie="Abre una clase para pasar lista, ver quién vio la grabación y revisar resúmenes.">
          {listaClases.map((c, i) => {
            const inscritos = c.tema!.curso.curso_inscripciones.filter((x) => x.activo).length
            const hechas = marcadasPor.get(c.id) ?? 0
            const esHoy = c.fecha === hoy
            return (
              <Fila key={c.id} href={`/academia/sesiones/${c.id}`} primero={i === 0}
                inicio={<IconoModulo icon={Video} color={esHoy ? '#ff3b30' : '#a35d2d'} tamano={36} />}
                titulo={c.tema!.titulo}
                subtitulo={`${c.tema!.curso.nombre} · ${esHoy ? 'Hoy' : formatDate(c.fecha)}${c.hora_inicio ? ` · ${c.hora_inicio.slice(0, 5)}` : ''}`}
                detalle={c.fecha > hoy ? <Badge variant="muted">Próxima</Badge>
                  : <Badge variant={hechas >= inscritos && inscritos ? 'success' : 'warning'}>{hechas >= inscritos && inscritos ? 'Lista pasada' : `Asistencia ${hechas}/${inscritos}`}</Badge>} />
            )
          })}
        </Grupo>
      )}

      {!cursos?.length ? (
        <Vacio icono={<School size={44} />} titulo="Aún no hay cursos" texto="Crea el primero con el formulario de abajo." />
      ) : (
        <Grupo titulo="Cursos">
          {cursos.map((c, i) => {
            const profesor = c.profesor as unknown as { nombre_completo: string } | null
            const alumnos = (c.curso_inscripciones as { activo: boolean }[]).filter((x) => x.activo).length
            const estado = ESTADO[c.estado] ?? ESTADO.borrador!
            return (
              <Fila key={c.id} href={`/academia/cursos/${c.id}`} primero={i === 0}
                inicio={<IconoModulo icon={School} color="#af52de" tamano={36} />}
                titulo={c.nombre}
                subtitulo={[`${alumnos} alumnos`, `${(c.temas as unknown[]).length} temas`, profesor?.nombre_completo].filter(Boolean).join(' · ')}
                detalle={<Badge variant={estado.variant}>{estado.label}</Badge>} />
            )
          })}
        </Grupo>
      )}

      <Tarjeta titulo="Nuevo curso">
        <FormAccion accion={crearCurso} textoBoton="Crear curso" irA="/academia/cursos/{id}">
          <Input name="nombre" label="Nombre del curso *" placeholder="Ej. Fundamentos de la fe" required />
          <Textarea name="descripcion" label="Descripción" rows={2} />
          <BuscadorPersona name="profesor_id" label="Profesor" vacio="Sin asignar"
            personas={(personas ?? []).map((p) => ({ id: p.id, nombre: p.nombre_completo }))} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input name="fecha_inicio" type="date" label="Fecha de inicio" />
            <Input name="fecha_fin" type="date" label="Fecha de fin" />
          </div>
        </FormAccion>
      </Tarjeta>
    </Pagina>
  )
}
