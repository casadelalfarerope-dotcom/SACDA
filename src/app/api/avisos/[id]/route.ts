import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Al tocar un aviso: se marca como leído y se abre su destino (?a=/ruta).
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  await supabase.from('notificaciones').update({ leida: true }).eq('id', id)
  const a = new URL(req.url).searchParams.get('a') ?? ''
  const destino = a.startsWith('/') && !a.startsWith('//') ? a : '/'
  return NextResponse.redirect(new URL(destino, req.url))
}
