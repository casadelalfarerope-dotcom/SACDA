import Link from 'next/link'
import { GraduationCap, ChevronRight, Users, BookOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { crearCurso } from '@/app/actions/academia'
import FormAccion from '@/components/academia/FormAccion'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'
import Badge from '@/components/ui/Badge'

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
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <GraduationCap size={24} style={{ color: 'var(--accent)' }} />
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Academia</h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>El Taller del Alfarero</p>
        </div>
      </div>

      <section aria-labelledby="cursos-titulo" className="space-y-3">
        <h2 id="cursos-titulo" className="font-semibold" style={{ color: 'var(--foreground)' }}>Cursos</h2>
        {!cursos?.length && (
          <p className="text-sm py-6 text-center rounded-2xl border" style={{ color: 'var(--muted)', borderColor: 'var(--border)' }}>
            Aún no hay cursos. Crea el primero abajo.
          </p>
        )}
        {cursos?.map((c) => {
          const profesor = c.profesor as unknown as { nombre_completo: string } | null
          const alumnos = (c.curso_inscripciones as { activo: boolean }[]).filter((i) => i.activo).length
          const estado = ESTADO[c.estado] ?? ESTADO.borrador!
          return (
            <Link key={c.id} href={`/academia/cursos/${c.id}`}
              className="flex items-center gap-4 p-4 rounded-2xl border hover:opacity-80 transition-opacity"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold" style={{ color: 'var(--foreground)' }}>{c.nombre}</p>
                  <Badge variant={estado.variant}>{estado.label}</Badge>
                </div>
                <p className="text-xs mt-1 flex flex-wrap gap-x-3 gap-y-1" style={{ color: 'var(--muted)' }}>
                  <span className="inline-flex items-center gap-1"><Users size={12} aria-hidden="true" /> {alumnos} alumnos</span>
                  <span className="inline-flex items-center gap-1"><BookOpen size={12} aria-hidden="true" /> {(c.temas as unknown[]).length} temas</span>
                  {profesor && <span>Profesor: {profesor.nombre_completo}</span>}
                </p>
              </div>
              <ChevronRight size={18} aria-hidden="true" style={{ color: 'var(--muted)' }} />
            </Link>
          )
        })}
      </section>

      <section aria-labelledby="nuevo-curso" className="p-5 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <h2 id="nuevo-curso" className="font-semibold mb-4" style={{ color: 'var(--foreground)' }}>Nuevo curso</h2>
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
      </section>
    </div>
  )
}
