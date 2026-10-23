import { NextResponse } from 'next/server'
import { crearExcel, respuestaExcel } from '@/lib/excel'
import { createClient } from '@/lib/supabase/server'
import { hoyLima } from '@/lib/utils'

// Reporte para entregar a quien hará el seguimiento: visitas que faltan
// contactar y ausencias por atender. Solo con permiso de Seguimiento.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { data: permitido } = await supabase.rpc('tiene_permiso', { p_modulo: 'miembros', p_accion: 'ver' })
  if (permitido !== true) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

  const [{ data: visitas }, { data: ausencias }] = await Promise.all([
    supabase.from('seguimiento_visitas')
      .select('fecha_primera_visita, volvio, notas, persona:personas!seguimiento_visitas_persona_id_fkey(nombre_completo, telefono, direccion), referido:personas!seguimiento_visitas_referido_por_fkey(nombre_completo)')
      .eq('estado', 'pendiente').order('fecha_primera_visita'),
    supabase.from('ausencias')
      .select('fecha, motivo, persona:personas!ausencias_persona_id_fkey(nombre_completo, telefono, direccion, ministerio)')
      .eq('estado', 'pendiente').order('fecha'),
  ])

  type P = { nombre_completo: string; telefono: string | null; direccion: string | null; ministerio?: string | null } | null
  const filasVisitas = (visitas ?? []).map((v) => {
    const p = v.persona as unknown as P
    return {
      Nombre: p?.nombre_completo ?? '', 'Teléfono': p?.telefono ?? '', 'Dirección': p?.direccion ?? '',
      'Primera visita': v.fecha_primera_visita, '¿Volvió?': v.volvio ? 'Sí' : 'No',
      'Invitado por': (v.referido as unknown as { nombre_completo: string } | null)?.nombre_completo ?? '',
      Notas: v.notas ?? '', 'Resultado del contacto': '',
    }
  })

  const filasAusencias = (ausencias ?? []).map((a) => {
    const p = a.persona as unknown as P
    return {
      Nombre: p?.nombre_completo ?? '', 'Teléfono': p?.telefono ?? '', 'Dirección': p?.direccion ?? '',
      Ministerio: p?.ministerio ?? '', 'Fecha de la ausencia': a.fecha, Motivo: a.motivo ?? '', 'Resultado del contacto': '',
    }
  })

  const buf = await crearExcel([
    { nombre: 'Visitas por contactar', filas: filasVisitas, anchos: [32, 16, 30, 14, 9, 26, 30, 30],
      columnas: ['Nombre', 'Teléfono', 'Dirección', 'Primera visita', '¿Volvió?', 'Invitado por', 'Notas', 'Resultado del contacto'] },
    { nombre: 'Ausencias por atender', filas: filasAusencias, anchos: [32, 16, 30, 18, 18, 30, 30],
      columnas: ['Nombre', 'Teléfono', 'Dirección', 'Ministerio', 'Fecha de la ausencia', 'Motivo', 'Resultado del contacto'] },
  ])
  return respuestaExcel(buf, `seguimiento-${hoyLima()}.xlsx`)
}
