import { createClient } from '@/lib/supabase/server'
import { Bell, Mail, KeyRound, LogIn, Moon, CalendarSync } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import { IconoModulo } from '@/components/ui/IconoApp'
import { Pagina, Grupo, Fila } from '@/components/ui/ios'
import PreferenciasForm from './PreferenciasForm'
import ConexionGoogle from './ConexionGoogle'
import SeccionGoogle from '@/components/espacio/SeccionGoogle'
import { createServiceClient } from '@/lib/supabase/service'
import { conexion, googleConfigurado } from '@/lib/google'
import { formatDate } from '@/lib/utils'

export default async function ConfiguracionPage({ searchParams }: { searchParams: Promise<{ google?: string }> }) {
  const { google: aviso } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: cuenta } = user
    ? await supabase.from('cuentas').select('persona_id, persona:personas(nombre_completo, email, foto_url)').eq('id', user.id).maybeSingle()
    : { data: null }
  const persona = cuenta?.persona as unknown as { nombre_completo: string; email: string | null; foto_url: string | null } | null
  const conGoogle = user?.identities?.some((i) => i.provider === 'google')
  const { data: esAdmin } = await supabase.rpc('tiene_permiso', { p_modulo: 'roles', p_accion: 'editar' })
  const con = esAdmin === true ? await conexion(createServiceClient()) : null

  return (
    <Pagina ancho="estrecho" titulo="Configuración">
      <section aria-label="Tu perfil" className="rounded-2xl border p-4 flex items-center gap-4"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <Avatar nombre={persona?.nombre_completo ?? user?.email ?? '?'} fotoUrl={persona?.foto_url} size="lg" />
        <div className="min-w-0">
          <p className="text-[20px] font-semibold truncate" style={{ color: 'var(--foreground)' }}>{persona?.nombre_completo ?? 'Sin ficha vinculada'}</p>
          <p className="text-[15px] truncate" style={{ color: 'var(--muted)' }}>{user?.email}</p>
        </div>
      </section>

      <Grupo titulo="Cuenta">
        <Fila primero inicio={<IconoModulo icon={LogIn} color="#a35d2d" />} titulo="Inicio de sesión"
          detalle={conGoogle ? 'Google y correo' : 'Correo y contraseña'} />
        <Fila href="/cambiar-contrasena" inicio={<IconoModulo icon={KeyRound} color="#8e8e93" />} titulo="Cambiar contraseña" />
      </Grupo>

      <Grupo titulo="Notificaciones" pie="Las notificaciones dentro de la app están siempre activas. El correo se usa cuando tu ficha tiene uno registrado.">
        <Fila primero inicio={<IconoModulo icon={Bell} color="#ff3b30" />} titulo="En la app" subtitulo="Campana en la barra superior"
          detalle={<Badge variant="success">Activo</Badge>} />
        <Fila inicio={<IconoModulo icon={Mail} color="#a35d2d" />} titulo="Correo"
          subtitulo={persona?.email ?? 'Sin correo en tu ficha'}
          detalle={<Badge variant={persona?.email ? 'success' : 'muted'}>{persona?.email ? 'Activo' : 'Inactivo'}</Badge>} />
      </Grupo>

      {cuenta?.persona_id && <SeccionGoogle personaId={cuenta.persona_id as string} correoCuenta={user?.email ?? null} />}

      {esAdmin === true && (
        <Grupo titulo="Google Calendar de la iglesia"
          pie={!googleConfigurado()
            ? 'Faltan las claves de Google (GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET) en Vercel.'
            : 'La cuenta de la iglesia crea los eventos en su calendario “Casa del Alfarero” e invita a cada hermano según lo que eligió. Se pone al día al guardar cambios y cada mañana.'}>
          {aviso && AVISOS[aviso] && (
            <Fila primero titulo={<span style={{ color: aviso === 'conectado' ? 'var(--success)' : 'var(--error)' }}>{AVISOS[aviso]}</span>} />
          )}
          <Fila primero={!(aviso && AVISOS[aviso])} inicio={<IconoModulo icon={CalendarSync} color="#4285f4" />}
            titulo={con ? con.correo : 'Sin conectar'}
            subtitulo={con ? (con.ultimo_error ? `Error: ${con.ultimo_error}` : con.ultima_sync ? `Última sincronización: ${formatDate(con.ultima_sync, { time: true })}` : 'Sincronizando por primera vez…') : 'Conecta la cuenta de Google de la iglesia'}
            detalle={<Badge variant={con && !con.ultimo_error ? 'success' : 'muted'}>{con ? (con.ultimo_error ? 'Con error' : 'Conectada') : 'Inactiva'}</Badge>} />
          {googleConfigurado() && <Fila><ConexionGoogle conectada={!!con} /></Fila>}
        </Grupo>
      )}

      <Grupo titulo="Apariencia">
        <Fila primero inicio={<IconoModulo icon={Moon} color="#5856d6" />}>
          <span className="block py-1"><PreferenciasForm /></span>
        </Fila>
      </Grupo>
    </Pagina>
  )
}

const AVISOS: Record<string, string> = {
  conectado: 'Cuenta de Google conectada. Los eventos se están enviando.',
  cancelado: 'Se canceló la conexión con Google.',
  error: 'No se pudo conectar con Google. Inténtalo de nuevo.',
  'sin-refresh': 'Google no entregó el permiso permanente. Quita el acceso de SACDA en tu cuenta de Google y vuelve a conectar.',
  'sin-permiso': 'Solo Administración puede conectar la cuenta de Google.',
  'sin-claves': 'Faltan las claves de Google en Vercel.',
}
