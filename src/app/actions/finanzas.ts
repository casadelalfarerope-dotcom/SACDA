'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function registrarAporte(data: {
  persona_id: string
  tipo: string
  monto: string
  fecha: string
  concepto?: string
}) {
  const monto = parseFloat(data.monto)
  if (!data.persona_id) return { error: 'Selecciona una persona.' }
  if (isNaN(monto) || monto <= 0) return { error: 'El monto debe ser mayor a 0.' }
  if (!data.fecha) return { error: 'La fecha es obligatoria.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase.from('aportes').insert({
    persona_id: data.persona_id,
    tipo: data.tipo,
    monto,
    fecha: data.fecha,
    concepto: data.concepto?.trim() || null,
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
  })
  if (error) return { error: 'No se pudo registrar.' }
  revalidatePath(`/finanzas/actividades/${data.actividad_id}`)
  return { success: true }
}
