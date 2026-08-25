import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft, Church, Plus } from 'lucide-react'
import { formatDateShort } from '@/lib/utils'
import Badge from '@/components/ui/Badge'

const tipoLabel: Record<string, string> = {
  bautismo: 'Bautismo',
  dedicacion: 'Dedicación',
  boda: 'Boda',
}
const tipoVariant: Record<string, 'default' | 'success' | 'warning'> = {
  bautismo: 'default',
  dedicacion: 'warning',
  boda: 'success',
}

export default async function CeremoniasPage() {
  const supabase = await createClient()

  const { data: ceremonias } = await supabase
    .from('ceremonias')
    .select('*, ceremonia_personas(rol_en_ceremonia, nombre_externo, persona:personas(nombre_completo))')
    .order('fecha', { ascending: false })

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/miembros"
          className="p-2 rounded-xl hover:opacity-70 transition-opacity"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <ArrowLeft size={18} style={{ color: 'var(--foreground)' }} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Ceremonias</h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>{ceremonias?.length ?? 0} registros</p>
        </div>
        <Link href="/miembros/ceremonias/nueva"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-80"
          style={{ background: 'var(--accent)' }}>
          <Plus size={15} /> Nueva
        </Link>
      </div>

      {!ceremonias || ceremonias.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--muted)' }}>
          <Church size={40} className="mx-auto mb-3 opacity-30" />
          <p>Sin ceremonias registradas.</p>
        </div>
      ) : (
        <div className="space-y-2 stagger">
          {ceremonias.map((c) => {
            const nombres = (c.ceremonia_personas ?? [])
              .map((cp: { nombre_externo?: string | null; persona?: { nombre_completo: string } | null }) =>
                cp.persona?.nombre_completo ?? cp.nombre_externo ?? ''
              )
              .filter(Boolean)
              .join(', ')
            return (
              <div key={c.id}
                className="flex items-center gap-4 px-4 py-3 rounded-2xl border"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                    {tipoLabel[c.tipo] ?? c.tipo}
                    {nombres ? ` — ${nombres}` : ''}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>
                    {formatDateShort(c.fecha)}
                    {c.officiante ? ` · Oficia: ${c.officiante}` : ''}
                  </p>
                </div>
                <Badge label={tipoLabel[c.tipo] ?? c.tipo} variant={tipoVariant[c.tipo] ?? 'default'} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
