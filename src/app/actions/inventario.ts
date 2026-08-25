'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function crearBien(data: {
  nombre: string
  descripcion?: string
  categoria: string
  numero_serie?: string
  fecha_compra?: string
  valor_compra?: string
  vida_util_anios?: string
  estado: string
  proximo_mantenimiento?: string
  intervalo_mantenimiento_dias?: string
  ubicacion?: string
  notas?: string
}) {
  if (!data.nombre?.trim()) return { error: 'El nombre es obligatorio.' }

  const supabase = await createClient()
  const { data: bien, error } = await supabase.from('bienes').insert({
    nombre: data.nombre.trim(),
    descripcion: data.descripcion?.trim() || null,
    categoria: data.categoria,
    numero_serie: data.numero_serie?.trim() || null,
    fecha_compra: data.fecha_compra || null,
    valor_compra: data.valor_compra ? parseFloat(data.valor_compra) : null,
    vida_util_anios: data.vida_util_anios ? parseInt(data.vida_util_anios) : null,
    estado: data.estado,
    proximo_mantenimiento: data.proximo_mantenimiento || null,
    intervalo_mantenimiento_dias: data.intervalo_mantenimiento_dias ? parseInt(data.intervalo_mantenimiento_dias) : null,
    ubicacion: data.ubicacion?.trim() || null,
    notas: data.notas?.trim() || null,
  }).select().single()

  if (error) return { error: 'No se pudo registrar el bien.' }
  revalidatePath('/inventario')
  return { success: true, id: bien.id }
}

export async function actualizarEstadoBien(id: string, estado: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('bienes').update({ estado }).eq('id', id)
  if (error) return { error: 'No se pudo actualizar.' }
  revalidatePath('/inventario')
  revalidatePath(`/inventario/${id}`)
  return { success: true }
}

export async function registrarMantenimiento(data: {
  bien_id: string
  fecha: string
  descripcion: string
  costo?: string
  realizado_por?: string
}) {
  if (!data.descripcion?.trim()) return { error: 'La descripción es obligatoria.' }
  if (!data.fecha) return { error: 'La fecha es obligatoria.' }

  const supabase = await createClient()

  const { error } = await supabase.from('mantenimiento_historial').insert({
    bien_id: data.bien_id,
    fecha: data.fecha,
    descripcion: data.descripcion.trim(),
    costo: data.costo ? parseFloat(data.costo) : null,
    realizado_por: data.realizado_por?.trim() || null,
  })
  if (error) return { error: 'No se pudo registrar.' }

  // Calcular y actualizar próximo mantenimiento si hay intervalo
  const { data: bien } = await supabase
    .from('bienes').select('intervalo_mantenimiento_dias').eq('id', data.bien_id).single()

  if (bien?.intervalo_mantenimiento_dias) {
    const proxima = new Date(data.fecha)
    proxima.setDate(proxima.getDate() + bien.intervalo_mantenimiento_dias)
    await supabase.from('bienes')
      .update({ proximo_mantenimiento: proxima.toISOString().split('T')[0] })
      .eq('id', data.bien_id)
  }

  revalidatePath(`/inventario/${data.bien_id}`)
  return { success: true }
}
