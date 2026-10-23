import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { contextoEspacio, misMinisterios } from '@/lib/espacio'
import { cargarPrograma } from '@/lib/programas'
import { formatDate } from '@/lib/utils'
import { Pagina } from '@/components/ui/ios'
import ParteMinisterio from '@/components/programas/ParteMinisterio'

// El líder programa la parte de su ministerio en un culto.
export default async function ProgramarCultoPage({ params }: { params: Promise<{ id: string; programaId: string }> }) {
  const { id, programaId } = await params
  const ctx = await contextoEspacio()
  const mio = (await misMinisterios(ctx.personaId)).find((m) => m.id === id)
  if (!mio?.esLider) notFound()

  const supabase = await createClient()
  const { data: programa } = await supabase.from('programas')
    .select('id, titulo, fecha, hora_inicio, cancelado').eq('id', programaId).maybeSingle()
  if (!programa) notFound()

  const [parte] = await cargarPrograma(supabase, programaId, [id])

  return (
    <Pagina ancho="estrecho" titulo={programa.titulo} volver={{ href: `/mi/ministerios/${id}`, texto: mio.nombre }}
      subtitulo={`${formatDate(programa.fecha)}${programa.hora_inicio ? ` · ${programa.hora_inicio.slice(0, 5)}` : ''}`}>
      {parte ? (
        <ParteMinisterio programaId={programaId} grupo={parte.grupo} estado={parte.estado}
          puestos={parte.puestos} integrantes={parte.integrantes} puedeEditar={!programa.cancelado} />
      ) : (
        <p className="text-[15px]" style={{ color: 'var(--muted)' }}>Tu ministerio aún no tiene puestos definidos.</p>
      )}
      <p className="text-[13px] px-1" style={{ color: 'var(--muted)' }}>
        Al publicar, cada persona asignada recibe un aviso y lo ve en Mi espacio. El pastor ve el avance en el panel.
      </p>
    </Pagina>
  )
}
