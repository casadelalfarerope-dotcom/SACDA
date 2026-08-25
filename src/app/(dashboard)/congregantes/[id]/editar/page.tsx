import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import PersonaForm from '@/components/PersonaForm'
import { editarPersona } from '@/app/actions/congregantes'

export default async function EditarCongregantePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: persona } = await supabase
    .from('personas')
    .select('*')
    .eq('id', id)
    .single()

  if (!persona) notFound()

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/congregantes/${id}`}
          className="p-2 rounded-xl transition-opacity hover:opacity-70"
          style={{ color: 'var(--muted)' }}>
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
            Editar congregante
          </h1>
          <p className="text-sm mt-0.5 truncate" style={{ color: 'var(--muted)' }}>
            {persona.nombre_completo}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border p-5 md:p-6"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <PersonaForm
          persona={persona}
          onSubmit={(data) => editarPersona(id, data)}
        />
      </div>
    </div>
  )
}
