import { CalendarDays } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { conexion } from '@/lib/google'
import { Grupo, Fila } from '@/components/ui/ios'
import { IconoModulo } from '@/components/ui/IconoApp'
import GoogleCalendarForm from './GoogleCalendarForm'

// Preferencias de Google Calendar del usuario (Mi perfil y Configuración).
export default async function SeccionGoogle({ personaId, correoCuenta }: { personaId: string; correoCuenta: string | null }) {
  const supabase = await createClient()
  const [{ data: pref }, con] = await Promise.all([
    supabase.from('google_preferencias').select('activo, correo, tipos').eq('persona_id', personaId).maybeSingle(),
    conexion(createServiceClient()),
  ])
  return (
    <Grupo titulo="Google Calendar">
      <Fila primero inicio={<IconoModulo icon={CalendarDays} color="#4285f4" />}>
        <span className="block py-2">
          <GoogleCalendarForm iglesiaConectada={!!con} correoIglesia={con?.correo ?? null}
            inicial={{
              activo: pref?.activo ?? false,
              correo: (pref?.correo as string | null) ?? correoCuenta ?? '',
              tipos: (pref?.tipos as string[] | null) ?? ['cultos', 'especiales', 'ministerio', 'turnos', 'academia'],
            }} />
        </span>
      </Fila>
    </Grupo>
  )
}
