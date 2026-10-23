import { KeyRound, Moon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { contextoEspacio } from '@/lib/espacio'
import { formatDate } from '@/lib/utils'
import Avatar from '@/components/ui/Avatar'
import { IconoModulo } from '@/components/ui/IconoApp'
import { Pagina, Grupo, Fila, Tarjeta } from '@/components/ui/ios'
import ContactoForm from '@/components/espacio/ContactoForm'
import PreferenciasForm from '@/app/(dashboard)/configuracion/PreferenciasForm'

export default async function MiPerfilPage() {
  const ctx = await contextoEspacio()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: p } = await supabase.from('personas')
    .select('nombre_completo, dni, fecha_nacimiento, telefono, email, direccion, ministerio, foto_url')
    .eq('id', ctx.personaId).single()

  return (
    <Pagina ancho="estrecho" titulo="Mi perfil">
      <section aria-label="Tu perfil" className="rounded-2xl border p-4 flex items-center gap-4"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <Avatar nombre={p?.nombre_completo ?? '?'} fotoUrl={p?.foto_url} size="lg" />
        <div className="min-w-0">
          <p className="text-[20px] font-semibold truncate" style={{ color: 'var(--foreground)' }}>{p?.nombre_completo}</p>
          <p className="text-[15px] truncate" style={{ color: 'var(--muted)' }}>{user?.email}</p>
        </div>
      </section>

      <Grupo titulo="Mi ficha" pie="Si alguno de estos datos está mal, pide a un líder que lo corrija.">
        <Fila primero titulo="DNI" detalle={p?.dni ?? '—'} />
        <Fila titulo="Fecha de nacimiento" detalle={p?.fecha_nacimiento ? formatDate(p.fecha_nacimiento) : '—'} />
        <Fila titulo="Ministerio" detalle={p?.ministerio ?? '—'} />
      </Grupo>

      <Tarjeta titulo="Datos de contacto">
        <ContactoForm inicial={{ telefono: p?.telefono ?? '', email: p?.email ?? '', direccion: p?.direccion ?? '' }} />
      </Tarjeta>

      <Grupo titulo="Cuenta">
        <Fila primero href="/cambiar-contrasena" inicio={<IconoModulo icon={KeyRound} color="#8e8e93" />} titulo="Cambiar contraseña" />
      </Grupo>

      <Grupo titulo="Apariencia">
        <Fila primero inicio={<IconoModulo icon={Moon} color="#5856d6" />}>
          <span className="block py-1"><PreferenciasForm /></span>
        </Fila>
      </Grupo>
    </Pagina>
  )
}
