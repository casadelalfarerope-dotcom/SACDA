import { School, Eye } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { crearCurso } from '@/app/actions/academia'
import FormAccion from '@/components/academia/FormAccion'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'
import Badge from '@/components/ui/Badge'
import { IconoModulo } from '@/components/ui/IconoApp'
import { Pagina, Grupo, Fila, Tarjeta, Vacio, BotonEnlace } from '@/components/ui/ios'

const ESTADO: Record<string, { label: string; variant: 'muted' | 'success' | 'default' }> = {
  borrador: { label: 'Borrador', variant: 'muted' },
  activo: { label: 'Activo', variant: 'success' },
  finalizado: { label: 'Finalizado', variant: 'default' },
}

export default async function AcademiaPage() {
  const supabase = await createClient()
  const [{ data: cursos }, { data: personas }] = await Promise.all([
    supabase.from('cursos')
      .select('id, nombre, estado, fecha_inicio, profesor:personas(nombre_completo), curso_inscripciones(activo), temas(id)')
      .order('created_at', { ascending: false }),
    supabase.from('personas').select('id, nombre_completo').eq('estado', 'activo').order('nombre_completo'),
  ])

  return (
    <Pagina titulo="Academia" subtitulo="El Taller del Alfarero"
      acciones={<BotonEnlace href="/taller" variante="tintado"><Eye size={16} /> Ver como estudiante</BotonEnlace>}>
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
          <Select name="profesor_id" label="Profesor" placeholder="Sin asignar"
            options={(personas ?? []).map((p) => ({ value: p.id, label: p.nombre_completo }))} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input name="fecha_inicio" type="date" label="Fecha de inicio" />
            <Input name="fecha_fin" type="date" label="Fecha de fin" />
          </div>
        </FormAccion>
      </Tarjeta>
    </Pagina>
  )
}
