import { createClient } from '@/lib/supabase/server'
import NuevaAusenciaForm from './NuevaAusenciaForm'

export default async function NuevaAusenciaPage() {
  const supabase = await createClient()

  const { data: personas } = await supabase
    .from('personas')
    .select('id, nombre_completo')
    .eq('estado', 'activo')
    .order('nombre_completo')

  return <NuevaAusenciaForm personas={personas ?? []} />
}
