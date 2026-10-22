import Link from 'next/link'

export const metadata = { title: 'Política de privacidad — Casa del Alfarero' }

export default function PrivacidadPage() {
  return (
    <main className="min-h-screen px-4 py-12" style={{ background: 'var(--background)' }}>
      <article className="max-w-2xl mx-auto space-y-5 text-sm leading-relaxed" style={{ color: 'var(--foreground)' }}>
        <h1 className="text-2xl font-bold">Política de privacidad</h1>
        <p style={{ color: 'var(--muted)' }}>Última actualización: octubre de 2026</p>

        <p>
          SACDA es el sistema interno de administración de la iglesia <strong>Casa del Alfarero</strong> y de su
          academia <strong>El Taller del Alfarero</strong>. Solo pueden acceder personas invitadas por la iglesia.
        </p>

        <h2 className="text-lg font-semibold pt-2">Qué datos usamos</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Datos de la ficha de cada persona: nombre, DNI, contacto, fecha de nacimiento y ministerio.</li>
          <li>Al iniciar sesión con Google: tu nombre, correo electrónico y foto de perfil.</li>
          <li>La información que registras al usar el sistema (asistencias, aportes, tareas, notas, etc.).</li>
        </ul>

        <h2 className="text-lg font-semibold pt-2">Para qué los usamos</h2>
        <p>
          Únicamente para identificarte, darte acceso según tus roles y gestionar las actividades de la iglesia y
          la academia. No vendemos ni compartimos tus datos con terceros con fines comerciales.
        </p>

        <h2 className="text-lg font-semibold pt-2">Dónde se guardan</h2>
        <p>
          Los datos se almacenan en Supabase y la aplicación se aloja en Vercel. El acceso está restringido por
          roles; la información sensible (finanzas, ausencias) solo la ven las personas autorizadas.
        </p>

        <h2 className="text-lg font-semibold pt-2">Tus derechos</h2>
        <p>
          Puedes pedir ver, corregir o eliminar tus datos escribiendo a{' '}
          <a href="mailto:casadelalfarero.pe@gmail.com" className="underline" style={{ color: 'var(--accent)' }}>
            casadelalfarero.pe@gmail.com
          </a>.
        </p>

        <p className="pt-4">
          <Link href="/login" className="underline" style={{ color: 'var(--accent)' }}>Ir al inicio de sesión</Link>
        </p>
      </article>
    </main>
  )
}
