'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { MEDIOS_VALIDOS } from '@/lib/etiquetas'

const FECHA = /^\d{4}-\d{2}-\d{2}$/

function refrescar() {
  revalidatePath('/finanzas', 'layout')
  revalidatePath('/mi', 'layout')
}

async function personaActual() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, personaId: null }
  const { data } = await supabase.from('cuentas').select('persona_id').eq('id', user.id).single()
  return { supabase, personaId: (data?.persona_id as string | undefined) ?? null }
}

function leerMonto(texto: string) {
  const monto = Number(String(texto).replace(',', '.'))
  return Number.isFinite(monto) && monto > 0 ? Math.round(monto * 100) / 100 : null
}

export async function guardarFondo(datos: { id?: string; nombre: string; descripcion?: string; grupo_id?: string; meta?: string; activo?: boolean }) {
  const nombre = datos.nombre.trim()
  if (nombre.length < 3) return { error: 'Escribe un nombre para el fondo.' }
  const meta = datos.meta?.trim() ? leerMonto(datos.meta) : null
  if (datos.meta?.trim() && !meta) return { error: 'La meta debe ser un monto mayor a 0.' }
  const fila = { nombre, descripcion: datos.descripcion?.trim() || null, grupo_id: datos.grupo_id || null, meta, activo: datos.activo ?? true }
  const supabase = await createClient()
  const { data, error } = datos.id
    ? await supabase.from('fondos').update(fila).eq('id', datos.id).select('id')
    : await supabase.from('fondos').insert(fila).select('id')
  if (error || !data?.length) return { error: 'No tienes permiso o no se pudo guardar el fondo.' }
  refrescar()
  return { success: true, id: data[0]!.id as string }
}

// Ingreso o egreso suelto de un fondo (Tesorería o el líder del ministerio).
export async function registrarMovimientoFondo(datos: { fondo_id: string; tipo: 'ingreso' | 'egreso'; concepto: string; monto: string; fecha: string; medio?: string }) {
  const concepto = datos.concepto.trim()
  if (concepto.length < 3) return { error: 'Escribe el concepto (por ejemplo: “Venta de postres”).' }
  const monto = leerMonto(datos.monto)
  if (!monto) return { error: 'El monto debe ser mayor a 0.' }
  if (!FECHA.test(datos.fecha)) return { error: 'Elige la fecha.' }
  const { supabase, personaId } = await personaActual()
  if (!personaId) return { error: 'Tu sesión expiró.' }
  const { error } = await supabase.from('fondo_movimientos').insert({
    fondo_id: datos.fondo_id, tipo: datos.tipo, concepto, monto, fecha: datos.fecha, registrado_por: personaId,
    medio: (MEDIOS_VALIDOS as string[]).includes(datos.medio ?? '') ? datos.medio : 'efectivo',
  })
  if (error) return { error: error.code === '42501' ? 'No tienes permiso para registrar en este fondo.' : 'No se pudo registrar.' }
  refrescar()
  return { success: true }
}

export async function eliminarMovimientoFondo(id: string) {
  const supabase = await createClient()
  const { data: mov } = await supabase.from('fondo_movimientos').select('traspaso_id').eq('id', id).maybeSingle()
  if (!mov) return { error: 'No se encontró el movimiento.' }
  // Un traspaso entre fondos se borra completo (las dos puntas).
  const consulta = mov.traspaso_id
    ? supabase.from('fondo_movimientos').delete().eq('traspaso_id', mov.traspaso_id)
    : supabase.from('fondo_movimientos').delete().eq('id', id)
  const { data, error } = await consulta.select('id')
  if (error || !data?.length) return { error: 'No tienes permiso para borrar este movimiento.' }
  refrescar()
  return { success: true }
}

// Pasar dinero de un fondo a otro. 'general' es el Fondo General.
export async function traspasarFondos(datos: { desde: string; hacia: string; monto: string; fecha: string; concepto?: string }) {
  if (datos.desde === datos.hacia) return { error: 'Elige dos fondos distintos.' }
  const monto = leerMonto(datos.monto)
  if (!monto) return { error: 'El monto debe ser mayor a 0.' }
  if (!FECHA.test(datos.fecha)) return { error: 'Elige la fecha.' }
  const { supabase, personaId } = await personaActual()
  const ids = [datos.desde, datos.hacia].filter((f) => f !== 'general')
  const { data: fondos } = await supabase.from('fondos').select('id, nombre').in('id', ids)
  const nombre = (id: string) => id === 'general' ? 'Fondo General' : fondos?.find((f) => f.id === id)?.nombre ?? 'otro fondo'
  const nota = datos.concepto?.trim()
  const traspaso_id = crypto.randomUUID()
  const base = { monto, fecha: datos.fecha, traspaso: true, traspaso_id, registrado_por: personaId }
  const filas = [
    ...(datos.desde !== 'general' ? [{ ...base, fondo_id: datos.desde, tipo: 'egreso', concepto: nota || `Traspaso a ${nombre(datos.hacia)}` }] : []),
    ...(datos.hacia !== 'general' ? [{ ...base, fondo_id: datos.hacia, tipo: 'ingreso', concepto: nota || `Traspaso desde ${nombre(datos.desde)}` }] : []),
  ]
  const { error } = await supabase.from('fondo_movimientos').insert(filas)
  if (error) return { error: error.code === '42501' ? 'Solo Tesorería puede hacer traspasos.' : 'No se pudo hacer el traspaso.' }
  refrescar()
  return { success: true }
}
