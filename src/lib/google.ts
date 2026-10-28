import type { SupabaseClient } from '@supabase/supabase-js'

// Conexión con Google Calendar usando la cuenta de Google de la iglesia.
// Variables de entorno: GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET.

export const ZONA = 'America/Lima'
const API = 'https://www.googleapis.com/calendar/v3'
export const SCOPES = 'https://www.googleapis.com/auth/calendar openid email'

export function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'https://mi-sacda.vercel.app'
}
export const redirectUri = () => `${appUrl()}/api/google/callback`
export const googleConfigurado = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)

export function urlAutorizacion(estado: string) {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state: estado,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`
}

async function token(params: Record<string, string>) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      ...params,
    }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(`Google rechazó la conexión: ${json.error_description ?? json.error ?? res.status}`)
  return json as { access_token: string; refresh_token?: string; id_token?: string }
}

export const canjearCodigo = (code: string) =>
  token({ code, grant_type: 'authorization_code', redirect_uri: redirectUri() })
export const accesoDesdeRefresh = async (refresh: string) =>
  (await token({ refresh_token: refresh, grant_type: 'refresh_token' })).access_token

// Correo de la cuenta conectada (viene dentro del id_token).
export function correoDeIdToken(idToken?: string) {
  if (!idToken) return null
  try {
    const carga = JSON.parse(Buffer.from(idToken.split('.')[1]!, 'base64url').toString())
    return (carga.email as string) ?? null
  } catch { return null }
}

export class Google {
  constructor(private acceso: string) {}

  async pedir<T = Record<string, unknown>>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T | null> {
    for (let intento = 0; ; intento++) {
      const res = await fetch(API + ruta, {
        method: metodo,
        headers: { Authorization: `Bearer ${this.acceso}`, 'Content-Type': 'application/json' },
        body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      })
      // Límite de velocidad de Google: espera un poco y reintenta.
      if ((res.status === 403 || res.status === 429) && intento < 3) {
        await new Promise((r) => setTimeout(r, 800 * (intento + 1)))
        continue
      }
      if (res.status === 404 || res.status === 410) return null
      if (!res.ok) throw new Error(`Google Calendar (${res.status}): ${(await res.text()).slice(0, 200)}`)
      return res.status === 204 ? null : ((await res.json()) as T)
    }
  }
}

export async function conexion(admin: SupabaseClient) {
  const { data } = await admin.from('google_conexion').select('*').eq('id', 1).maybeSingle()
  return data as null | {
    correo: string; refresh_token: string; calendario_id: string | null
    ultima_sync: string | null; ultimo_error: string | null; bloqueo: string | null; pendiente: boolean
  }
}
