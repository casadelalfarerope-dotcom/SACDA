import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import GrupoForm from '@/components/ministerios/GrupoForm'
import { crearGrupo } from '@/app/actions/ministerios'

export default async function NuevoGrupoPage() {
  const supabase = await createClient()
  const { data: grupos } = await supabase
    .from('grupos')
    .select('id, nombre')
    .eq('activo', true)
    .order('nombre')

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/ministerios" className="p-2 rounded-xl" style={{ color: 'var(--muted)' }}>
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Nuevo grupo</h1>
      </div>
      <div className="rounded-2xl border p-5 md:p-6"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <GrupoForm grupos={grupos ?? []} onSubmit={crearGrupo} />
      </div>
    </div>
  )
}
