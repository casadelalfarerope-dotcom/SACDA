import { createClient } from '@/lib/supabase/server'
import { Bell, Mail, KeyRound, LogIn, Moon } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import { IconoModulo } from '@/components/ui/IconoApp'
import { Pagina, Grupo, Fila } from '@/components/ui/ios'
import PreferenciasForm from './PreferenciasForm'

export default async function ConfiguracionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: cuenta } = user
    ? await supabase.from('cuentas').select('persona_id, persona:personas(nombre_completo, email, foto_url)').eq('id', user.id).maybeSingle()
    : { data: null }
  const persona = cuenta?.persona as unknown as { nombre_completo: string; email: string | null; foto_url: string | null } | null
  const conGoogle = user?.identities?.some((i) => i.provider === 'google')

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

      <Grupo titulo="Apariencia">
        <Fila primero inicio={<IconoModulo icon={Moon} color="#5856d6" />}>
          <span className="block py-1"><PreferenciasForm /></span>
        </Fila>
      </Grupo>
    </Pagina>
  )
}
