import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import PersonaForm from '@/components/PersonaForm'
import { crearPersona } from '@/app/actions/congregantes'

export default function NuevoCongregantePage() {
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/congregantes"
          className="p-2 rounded-xl transition-opacity hover:opacity-70"
          style={{ color: 'var(--muted)' }}>
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
            Nuevo congregante
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
            Registrar nueva ficha personal
          </p>
        </div>
      </div>

      <div className="rounded-2xl border p-5 md:p-6"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <PersonaForm onSubmit={crearPersona} />
      </div>
    </div>
  )
}
