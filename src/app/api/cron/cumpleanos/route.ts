import { NextResponse } from 'next/server'
import { avisarCumpleaniosDeHoy } from '@/app/actions/notificaciones-auto'
import { createServiceClient } from '@/lib/supabase/service'
import { sincronizarGoogle } from '@/lib/google-sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Vercel la llama todos los días a las 7:00 a. m. (hora de Lima): avisa a todos
// los hermanos de los cumpleaños del día. Con CRON_SECRET configurado, solo
// responde a Vercel. También pone al día Google Calendar (los próximos 60 días).
export async function GET(req: Request) {
  const secreto = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  const esVercel = (req.headers.get('user-agent') ?? '').startsWith('vercel-cron')
  if (secreto ? auth !== `Bearer ${secreto}` : !esVercel) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const res = await avisarCumpleaniosDeHoy()
  await sincronizarGoogle(createServiceClient())
  return NextResponse.json(res)
}
