'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { MEDIOS_VALIDOS, type Medio } from '@/lib/etiquetas'

const medioValido = (m?: string): Medio => (MEDIOS_VALIDOS as string[]).includes(m ?? '') ? m as Medio : 'efectivo'

export async function registrarAporte(data: {
  persona_id: string
  tipo: string
  monto: string
  fecha: string
  concepto?: string
  fondo_id?: string
  medio?: string
}) {
  const monto = parseFloat(data.monto)
  if (isNaN(monto) || monto <= 0) return { error: 'El monto debe ser mayor a 0.' }
  if (!data.fecha) return { error: 'La fecha es obligatoria.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase.from('aportes').insert({
    persona_id: data.persona_id || null, // vacío = sobre sin nombre (anónimo)
    tipo: data.tipo,
    monto,
    fecha: data.fecha,
    concepto: data.concepto?.trim() || null,
    fondo_id: data.fondo_id || null,
    medio: medioValido(data.medio),
    registrado_por: user?.id ?? null,
  })
  if (error) return { error: 'No se pudo registrar el aporte.' }
  revalidatePath('/finanzas')
  revalidatePath('/finanzas/aportes')
  return { success: true }
}

export async function registrarGasto(data: {
  concepto: string
  monto: string
  fecha: string
  categoria: string
  descripcion?: string
  fondo_id?: string
  medio?: string
}) {
  const monto = parseFloat(data.monto)
  if (!data.concepto?.trim()) return { error: 'El concepto es obligatorio.' }
  if (isNaN(monto) || monto <= 0) return { error: 'El monto debe ser mayor a 0.' }
  if (!data.fecha) return { error: 'La fecha es obligatoria.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase.from('gastos').insert({
    concepto: data.concepto.trim(),
    monto,
    fecha: data.fecha,
    categoria: data.categoria,
    descripcion: data.descripcion?.trim() || null,
    fondo_id: data.fondo_id || null,
    medio: medioValido(data.medio),
    registrado_por: user?.id ?? null,
  })
  if (error) return { error: 'No se pudo registrar el gasto.' }
  revalidatePath('/finanzas')
  revalidatePath('/finanzas/gastos')
  return { success: true }
}

export async function crearActividad(data: {
  nombre: string
  fecha: string
  descripcion?: string
  evento_id?: string
  fondo_id?: string
}) {
  if (!data.nombre?.trim()) return { error: 'El nombre es obligatorio.' }
  if (!data.fecha) return { error: 'La fecha es obligatoria.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: act, error } = await supabase.from('actividades_financieras').insert({
    nombre: data.nombre.trim(),
    fecha: data.fecha,
    descripcion: data.descripcion?.trim() || null,
    evento_id: data.evento_id || null,
    fondo_id: data.fondo_id || null,
    created_by: user?.id ?? null,
  }).select().single()

  if (error) return { error: 'No se pudo crear la actividad.' }
  revalidatePath('/finanzas/actividades')
  return { success: true, id: act.id }
}

export async function registrarMovimiento(data: {
  actividad_id: string
  tipo: string
  concepto: string
  monto: string
  fecha: string
  medio?: string
}) {
  const monto = parseFloat(data.monto)
  if (!data.concepto?.trim()) return { error: 'El concepto es obligatorio.' }
  if (isNaN(monto) || monto <= 0) return { error: 'El monto debe ser mayor a 0.' }

  const supabase = await createClient()
  const { error } = await supabase.from('actividad_movimientos').insert({
    actividad_id: data.actividad_id,
    tipo: data.tipo,
    concepto: data.concepto.trim(),
    monto,
    fecha: data.fecha,
    medio: medioValido(data.medio),
  })
  if (error) return { error: 'No se pudo registrar.' }
  revalidatePath(`/finanzas/actividades/${data.actividad_id}`)
  return { success: true }
}

// ---------- Editar y eliminar (permisos de Finanzas: editar / eliminar) ----------

const FECHA = /^\d{4}-\d{2}-\d{2}$/
const TIPOS_APORTE = ['diezmo', 'ofrenda', 'pacto', 'otro']

function refrescarFinanzas() {
  revalidatePath('/finanzas', 'layout')
  revalidatePath('/mi', 'layout')
}

export async function actualizarAporte(id: string, data: {
  persona_id: string; tipo: string; monto: string; fecha: string; concepto?: string; fondo_id?: string; medio?: string
}) {
  const monto = parseFloat(String(data.monto).replace(',', '.'))
  if (!TIPOS_APORTE.includes(data.tipo)) return { error: 'Elige el tipo de aporte.' }
  if (isNaN(monto) || monto <= 0) return { error: 'El monto debe ser mayor a 0.' }
  if (!FECHA.test(data.fecha)) return { error: 'La fecha es obligatoria.' }
  const supabase = await createClient()
  const { data: filas, error } = await supabase.from('aportes').update({
    persona_id: data.persona_id || null, tipo: data.tipo, monto: Math.round(monto * 100) / 100, fecha: data.fecha,
    concepto: data.concepto?.trim() || null, fondo_id: data.fondo_id || null, medio: medioValido(data.medio),
  }).eq('id', id).select('id')
  if (error || !filas?.length) return { error: 'No tienes permiso para editar aportes o no se pudo guardar.' }
  refrescarFinanzas()
  return { success: true }
}

export async function eliminarAporte(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('aportes').delete().eq('id', id).select('id')
  if (error || !data?.length) return { error: 'No tienes permiso para eliminar aportes.' }
  refrescarFinanzas()
  return { success: true }
}

export async function actualizarGasto(id: string, data: {
  concepto: string; monto: string; fecha: string; categoria: string; descripcion?: string; fondo_id?: string; medio?: string
}) {
  const monto = parseFloat(String(data.monto).replace(',', '.'))
  if (!data.concepto?.trim()) return { error: 'El concepto es obligatorio.' }
  if (isNaN(monto) || monto <= 0) return { error: 'El monto debe ser mayor a 0.' }
  if (!FECHA.test(data.fecha)) return { error: 'La fecha es obligatoria.' }
  const supabase = await createClient()
  const { data: filas, error } = await supabase.from('gastos').update({
    concepto: data.concepto.trim(), monto: Math.round(monto * 100) / 100, fecha: data.fecha, categoria: data.categoria,
    descripcion: data.descripcion?.trim() || null, fondo_id: data.fondo_id || null, medio: medioValido(data.medio),
  }).eq('id', id).select('id')
  if (error || !filas?.length) return { error: 'No tienes permiso para editar gastos o no se pudo guardar.' }
  refrescarFinanzas()
  return { success: true }
}

export async function eliminarGasto(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('gastos').delete().eq('id', id).select('id')
  if (error || !data?.length) return { error: 'No tienes permiso para eliminar gastos.' }
  refrescarFinanzas()
  return { success: true }
}
