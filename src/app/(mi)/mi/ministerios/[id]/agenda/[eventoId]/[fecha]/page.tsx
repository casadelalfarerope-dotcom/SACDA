import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { contextoEspacio, misMinisterios } from '@/lib/espacio'
import { reuniones, integrantesDe } from '@/lib/agenda'
import { formatDate } from '@/lib/utils'
import { Pagina } from '@/components/ui/ios'
import { ListaMinisterio } from '@/components/agenda/FormulariosAgenda'

const sumar = (f: string, n: number) => { const d = new Date(f + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }

// Pasar lista en una reunión del ministerio.
export default async function ListaReunionPage({ params }: { params: Promise<{ id: string; eventoId: string; fecha: string }> }) {
  const { id, eventoId, fecha } = await params
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) notFound()
  const ctx = await contextoEspacio()
  const mio = (await misMinisterios(ctx.personaId)).find((m) => m.id === id)
  if (!mio?.gestiona) notFound()

  const admin = createServiceClient()
  // La reunión puede haberse movido unos días; se busca alrededor de su fecha original.
  const [cercanas, personas, { data: presentes }] = await Promise.all([
    reuniones(admin, { grupoIds: [id] }, sumar(fecha, -14), sumar(fecha, 14)),
    integrantesDe(admin, id),
    admin.from('asistencia_ministerio').select('persona_id').eq('evento_id', eventoId).eq('fecha', fecha),
  ])
  const reunion = cercanas.find((r) => r.evento_id === eventoId && r.fecha === fecha)
  if (!reunion) notFound()

  return (
    <Pagina ancho="estrecho" titulo="Pasar lista" subtitulo={`${reunion.titulo} · ${formatDate(reunion.fecha_real)}`}
      volver={{ href: `/mi/ministerios/${id}/agenda`, texto: 'Agenda' }}>
      <ListaMinisterio eventoId={eventoId} fecha={fecha} personas={personas} presentesIniciales={(presentes ?? []).map((p) => p.persona_id as string)} />
    </Pagina>
  )
}
