'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function marcarLeida(id: string) {
  const supabase = await createClient()
  await supabase.from('notificaciones').update({ leida: true }).eq('id', id)
  revalidatePath('/notificaciones')
}

export async function marcarTodasLeidas(persona_id: string) {
  const supabase = await createClient()
  await supabase.from('notificaciones').update({ leida: true })
    .eq('persona_id', persona_id).eq('leida', false)
  revalidatePath('/notificaciones')
}

export async function enviarNotificacion(data: {
  persona_id: string
  tipo: string
  titulo: string
  cuerpo?: string
  metadata?: Record<string, unknown>
}) {
  const supabase = await createClient()
  await supabase.from('notificaciones').insert({
    persona_id: data.persona_id,
    tipo: data.tipo,
    titulo: data.titulo,
    cuerpo: data.cuerpo ?? null,
    canal: 'in_app',
    metadata: data.metadata ?? {},
  })
}
