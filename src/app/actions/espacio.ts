'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { formatDate } from '@/lib/utils'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// La persona actualiza solo su teléfono, correo y dirección (la función de la
// base de datos ignora cualquier otro campo).
export async function actualizarMiContacto(datos: { telefono: string; email: string; direccion: string }) {
  const email = datos.email.trim()
  if (email && !EMAIL_RE.test(email)) return { error: 'El correo no tiene un formato válido.' }
  const telefono = datos.telefono.trim()
  if (telefono && !/^[+\d\s()-]{6,20}$/.test(telefono)) return { error: 'El teléfono solo puede tener números, espacios y el signo +.' }
  if (datos.direccion.length > 200) return { error: 'La dirección es demasiado larga.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tu sesión expiró. Vuelve a iniciar sesión.' }
  const { data: cuenta } = await supabase.from('cuentas')
    .select('persona:personas(foto_url)').eq('id', user.id).maybeSingle()
  const foto = (cuenta?.persona as unknown as { foto_url: string | null } | null)?.foto_url ?? ''

  const { error } = await supabase.rpc('actualizar_mi_contacto', {
    p_telefono: telefono, p_email: email, p_direccion: datos.direccion, p_foto_url: foto,
  })
  if (error) return { error: 'No se pudieron guardar tus datos. Inténtalo de nuevo.' }
  revalidatePath('/mi', 'layout')
  return { success: true }
}

// Un hermano pide permiso para vender algo al finalizar el culto. Queda
// pendiente y se avisa a quienes pueden aprobar ventas.
export async function solicitarVenta(datos: { titulo: string; detalle: string; fecha: string }) {
  const titulo = datos.titulo.trim()
  if (!titulo) return { error: 'Indica qué quieres vender.' }
  if (titulo.length > 120) return { error: 'El título es demasiado largo (máximo 120 caracteres).' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datos.fecha)) return { error: 'Elige la fecha en que quieres vender.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tu sesión expiró. Vuelve a iniciar sesión.' }

  const { data: tarea, error } = await supabase.from('tareas').insert({
    tipo: 'solicitud_venta',
    titulo,
    descripcion: datos.detalle.trim() || null,
    fecha_limite: datos.fecha,
    solicitante_id: user.id,
    estado: 'pendiente',
  }).select('id').single()
  if (error || !tarea) return { error: 'No se pudo enviar tu solicitud.' }

  // Avisar a los encargados de Ventas (cliente de servicio: la persona no
  // puede leer roles ni permisos ajenos).
  const admin = createServiceClient()
  const { data: permisos } = await admin.from('permisos_modulo')
    .select('rol_id').eq('modulo', 'ventas').eq('puede_editar', true)
  const rolIds = (permisos ?? []).map((p) => p.rol_id as string)
  if (rolIds.length) {
    const { data: encargados } = await admin.from('roles_asignados')
      .select('persona_id').in('rol_id', rolIds).eq('activo', true)
    const ids = [...new Set((encargados ?? []).map((e) => e.persona_id as string))]
    if (ids.length) {
      await admin.from('notificaciones').insert(ids.map((persona_id) => ({
        persona_id,
        tipo: 'solicitud_venta',
        titulo: 'Nueva solicitud de venta',
        cuerpo: `"${titulo}" para el ${formatDate(datos.fecha)}. Revísala en Ventas.`,
        url: `/tareas/${tarea.id}`,
      })))
    }
  }

  revalidatePath('/mi', 'layout')
  revalidatePath('/ventas')
  return { success: true }
}
